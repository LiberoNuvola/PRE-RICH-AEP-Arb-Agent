import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveOpenExposureObservationBindings } from '../src/exposure-observation-resolver.js'

const PROFILE_REF = 'fixture:provider-profile'
const PROFILE_VERSION = '1.2.0'

function exposureSet(overrides = {}) {
  return {
    recordType: 'OpenExposureSet',
    profileRef: PROFILE_REF,
    profileVersion: PROFILE_VERSION,
    items: [{
      recordRef: 'fixture:exposure:position:AAA',
      category: 'REALIZED_POSITION',
      assetRef: 'fixture:asset:AAA',
      unitRef: 'fixture:unit:AAA',
      scopeRef: 'fixture:scope:account-1',
      horizonRef: 'fixture:horizon:current',
      status: 'OPEN',
      grossQuantity: '2.500',
      observationRefs: ['fixture:obs:rest:1', 'fixture:obs:stream:1'],
    }],
    ...overrides,
  }
}

function observation(eventId, overrides = {}) {
  const source = overrides.source ?? {}
  const scope = overrides.scope ?? {}
  const evidence = overrides.evidence ?? {}
  const quality = overrides.quality ?? {}
  return {
    recordType: 'ObservationRecord',
    envelopeVersion: 'arb-event-envelope/0.2',
    eventId,
    eventKind: 'PositionObserved',
    evidenceClass: 'OBSERVED',
    source: {
      sourceId: 'fixture:source:account-api',
      sourceEventId: 'provider-native-event-77',
      streamId: 'fixture:stream:positions',
      ...source,
    },
    scope: {
      profileRef: PROFILE_REF,
      profileVersion: PROFILE_VERSION,
      subjects: {accountRef: 'fixture:account:1'},
      ...scope,
    },
    timestamps: {
      sourceObservedAt: '2026-11-05T10:00:00.000Z',
      receivedAt: '2026-11-05T10:00:00.100Z',
      effectiveAt: null,
      clockQuality: 'SOURCE_TIME_PRESENT',
    },
    relations: {correlationRef: null, causationRef: null, supersedesRef: null},
    evidence: {
      rawEvidenceRef: 'fixture:raw:' + eventId,
      rawDigestRef: 'sha256:fixture:' + eventId,
      normalizedDigestRef: 'sha256:normalized:' + eventId,
      canonicalizationVersion: 'fixture-canonical/1',
      verificationRef: null,
      verificationStatus: 'NOT_VERIFIED',
      evidenceVersion: 'fixture-provider-payload/1',
      ...evidence,
    },
    quality: {status: 'VALID', reasons: [], ...quality},
    payload: {quantity: '2.500'},
  }
}

test('resolver binds every OpenExposure item to exact ObservationRecord eventIds and EXP-06 fields', () => {
  const result = resolveOpenExposureObservationBindings(
    exposureSet(),
    [
      observation('fixture:obs:rest:1'),
      observation('fixture:obs:stream:1', {source: {sourceId: 'fixture:source:user-stream', sourceEventId: null}}),
    ],
  )

  assert.equal(result.resolutionStatus, 'RESOLVED')
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].bindings.length, 2)
  assert.equal(result.items[0].bindings[0].sourceReference, 'fixture:source:account-api')
  assert.equal(result.items[0].bindings[0].observationReference, 'fixture:obs:rest:1')
  assert.equal(result.items[0].bindings[0].evidenceDigest, 'sha256:fixture:fixture:obs:rest:1')
  assert.equal(result.items[0].bindings[0].evidenceVersion, 'fixture-provider-payload/1')
  assert.equal(result.items[0].bindings[0].verificationStatus, 'NOT_VERIFIED')
  assert.equal(result.items[0].bindings[1].observationReference, 'fixture:obs:stream:1')
  assert.equal(result.items[0].bindings[1].sourceReference, 'fixture:source:user-stream')
  assert.equal(result.sourceOperationMappingStatus, 'NOT_CHECKED')
  assert.equal(result.rawDigestIntegrityStatus, 'NOT_CHECKED')
  assert.equal(result.verificationTrustAssessment, 'NOT_PERFORMED')
  assert.equal(result.authorityGranted, false)
  assert.equal(result.economicAdmissionGranted, false)
})

test('missing ObservationRecord reference remains INCOMPLETE, not empty or zero', () => {
  const result = resolveOpenExposureObservationBindings(exposureSet(), [observation('fixture:obs:rest:1')])
  assert.equal(result.resolutionStatus, 'INCOMPLETE')
  assert.equal(result.items[0].resolutionStatus, 'INCOMPLETE')
  assert.equal(result.issues[0].code, 'OBSERVATION_REFERENCE_NOT_FOUND')
})

test('duplicate ObservationRecord eventIds are CONFLICTED', () => {
  const record = observation('fixture:obs:rest:1')
  const result = resolveOpenExposureObservationBindings(
    exposureSet({items: [{...exposureSet().items[0], observationRefs: ['fixture:obs:rest:1']}]}),
    [record, {...record}],
  )
  assert.equal(result.resolutionStatus, 'CONFLICTED')
  assert.equal(result.issues[0].code, 'DUPLICATE_OBSERVATION_EVENT_ID')
})

test('profileRef or profileVersion mismatch is CONFLICTED', () => {
  const wrongProfile = observation('fixture:obs:rest:1', {scope: {profileRef: 'fixture:other-profile'}})
  const wrongVersion = observation('fixture:obs:stream:1', {scope: {profileVersion: '9.9.9'}})
  const result = resolveOpenExposureObservationBindings(exposureSet(), [wrongProfile, wrongVersion])
  assert.equal(result.resolutionStatus, 'CONFLICTED')
  assert.equal(result.items[0].bindings.length, 0)
  assert.deepEqual(result.issues.map(issue => issue.code), ['PROFILE_SCOPE_MISMATCH', 'PROFILE_SCOPE_MISMATCH'])
})

test('missing EXP-06 tuple members are INCOMPLETE', () => {
  const cases = [
    {name: 'source identity', mutate: record => { delete record.source.sourceId }},
    {name: 'raw evidence location', mutate: record => { delete record.evidence.rawEvidenceRef }},
    {name: 'raw evidence digest', mutate: record => { delete record.evidence.rawDigestRef }},
    {name: 'evidence version', mutate: record => { delete record.evidence.evidenceVersion }},
    {name: 'verification status', mutate: record => { delete record.evidence.verificationStatus }},
    {name: 'verification reference field', mutate: record => { delete record.evidence.verificationRef }},
  ]
  for (const item of cases) {
    const record = observation('fixture:obs:rest:1')
    item.mutate(record)
    const result = resolveOpenExposureObservationBindings(
      exposureSet({items: [{...exposureSet().items[0], observationRefs: ['fixture:obs:rest:1']}]}),
      [record],
    )
    assert.equal(result.resolutionStatus, 'INCOMPLETE', item.name)
    assert.equal(result.issues[0].code, 'EXP06_TUPLE_OR_ENVELOPE_INCOMPLETE', item.name)
  }
})

test('unknown verification status is INVALID', () => {
  const record = observation('fixture:obs:rest:1', {evidence: {verificationStatus: 'MAYBE_VERIFIED'}})
  const result = resolveOpenExposureObservationBindings(
    exposureSet({items: [{...exposureSet().items[0], observationRefs: ['fixture:obs:rest:1']}]}),
    [record],
  )
  assert.equal(result.resolutionStatus, 'INVALID')
  assert.equal(result.issues[0].code, 'EXP06_VERIFICATION_STATUS_INVALID')
})

test('positive verification claim without verificationRef is INVALID', () => {
  const record = observation('fixture:obs:rest:1', {evidence: {verificationStatus: 'VERIFIED_BY_SEPARATE_VERIFIER'}})
  const result = resolveOpenExposureObservationBindings(
    exposureSet({items: [{...exposureSet().items[0], observationRefs: ['fixture:obs:rest:1']}]}),
    [record],
  )
  assert.equal(result.resolutionStatus, 'INVALID')
  assert.equal(result.issues[0].code, 'POSITIVE_VERIFICATION_WITHOUT_REFERENCE')
})

test('positive verification is a source claim; verifier reference is not resolved or trusted here', () => {
  const record = observation('fixture:obs:rest:1', {
    evidence: {verificationStatus: 'VERIFIED_BY_SEPARATE_VERIFIER', verificationRef: 'fixture:verification:1'},
  })
  const result = resolveOpenExposureObservationBindings(
    exposureSet({items: [{...exposureSet().items[0], observationRefs: ['fixture:obs:rest:1']}]}),
    [record],
  )
  assert.equal(result.resolutionStatus, 'RESOLVED')
  assert.equal(result.items[0].bindings[0].verificationClaimStatus, 'SOURCE_REPORTED_NOT_INDEPENDENTLY_ASSESSED')
  assert.equal(result.items[0].bindings[0].verificationReferenceStatus, 'PRESENT_NOT_RESOLVED')
  assert.equal(result.verificationTrustAssessment, 'NOT_PERFORMED')
})

test('ObservationRecord quality is carried through but not promoted into EXP-06 verification', () => {
  const result = resolveOpenExposureObservationBindings(
    exposureSet({items: [{...exposureSet().items[0], observationRefs: ['fixture:obs:rest:1']}]}),
    [observation('fixture:obs:rest:1', {quality: {status: 'STALE'}})],
  )
  assert.equal(result.resolutionStatus, 'RESOLVED')
  assert.equal(result.items[0].bindings[0].observationQualityStatus, 'STALE')
  assert.equal(result.items[0].bindings[0].verificationStatus, 'NOT_VERIFIED')
})

test('an empty OpenExposure set remains INCOMPLETE', () => {
  const result = resolveOpenExposureObservationBindings(exposureSet({items: []}), [observation('fixture:obs:rest:1')])
  assert.equal(result.resolutionStatus, 'INCOMPLETE')
})

test('resolver rejects malformed inputs without throwing', () => {
  assert.equal(resolveOpenExposureObservationBindings(null, []).resolutionStatus, 'INVALID')
  assert.equal(resolveOpenExposureObservationBindings(exposureSet(), null).resolutionStatus, 'INVALID')
})
