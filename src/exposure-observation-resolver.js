import { classifyOpenExposureSet } from './reducer.js'

const VERIFICATION_STATUSES = new Set([
  'NOT_VERIFIED',
  'VERIFIED_BY_SEPARATE_VERIFIER',
  'UNVERIFIABLE',
  'REJECTED',
])
const OBSERVATION_QUALITY_STATUSES = new Set([
  'VALID', 'STALE', 'GAPPED', 'CONFLICTED', 'INCOMPLETE', 'UNAVAILABLE', 'INVALID', 'UNKNOWN',
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readOwn(record, key) {
  if (!isRecord(record)) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(record, key)
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : undefined
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function resolutionResult(resolutionStatus, items, issues, profileRef, profileVersion) {
  return Object.freeze({
    recordType: 'OpenExposureEvidenceResolution',
    contractVersion: '0.1',
    resolutionStatus,
    profileRef: profileRef ?? null,
    profileVersion: profileVersion ?? null,
    items,
    issues,
    sourceOperationMappingStatus: 'NOT_CHECKED',
    rawDigestIntegrityStatus: 'NOT_CHECKED',
    verificationTrustAssessment: 'NOT_PERFORMED',
    authorityGranted: false,
    economicAdmissionGranted: false,
    externalSideEffectPerformed: false,
  })
}

function statusRank(status) {
  return status === 'INVALID' ? 3
    : status === 'CONFLICTED' ? 2
      : status === 'INCOMPLETE' ? 1
        : 0
}

function worseStatus(left, right) {
  return statusRank(right) > statusRank(left) ? right : left
}

function inspectObservationRecord(record, eventId, expectedProfileRef, expectedProfileVersion, recordRef) {
  const issues = []
  if (!isRecord(record) ||
      readOwn(record, 'recordType') !== 'ObservationRecord' ||
      readOwn(record, 'eventId') !== eventId ||
      !nonEmpty(readOwn(record, 'envelopeVersion')) ||
      !nonEmpty(readOwn(record, 'eventKind')) ||
      readOwn(record, 'evidenceClass') !== 'OBSERVED') {
    return {
      resolutionStatus: 'INVALID',
      binding: null,
      issues: [{recordRef, eventId, code: 'OBSERVATION_RECORD_ENVELOPE_INVALID'}],
    }
  }

  const scope = readOwn(record, 'scope')
  const source = readOwn(record, 'source')
  const evidence = readOwn(record, 'evidence')
  const quality = readOwn(record, 'quality')

  if (!isRecord(scope) ||
      readOwn(scope, 'profileRef') !== expectedProfileRef ||
      readOwn(scope, 'profileVersion') !== expectedProfileVersion) {
    return {
      resolutionStatus: 'CONFLICTED',
      binding: null,
      issues: [{recordRef, eventId, code: 'PROFILE_SCOPE_MISMATCH'}],
    }
  }

  const missing = []
  if (!isRecord(source) || !nonEmpty(readOwn(source, 'sourceId')) || !nonEmpty(readOwn(source, 'streamId'))) {
    missing.push('source.sourceId/source.streamId')
  }
  if (!isRecord(evidence)) {
    missing.push('evidence')
  } else {
    for (const key of ['rawEvidenceRef', 'rawDigestRef', 'evidenceVersion']) {
      if (!nonEmpty(readOwn(evidence, key))) missing.push('evidence.' + key)
    }

    const verificationStatus = readOwn(evidence, 'verificationStatus')
    if (verificationStatus === undefined || verificationStatus === null || verificationStatus === '') {
      missing.push('evidence.verificationStatus')
    } else if (!VERIFICATION_STATUSES.has(verificationStatus)) {
      issues.push({recordRef, eventId, code: 'EXP06_VERIFICATION_STATUS_INVALID'})
    }

    const verificationRef = readOwn(evidence, 'verificationRef')
    if (verificationRef === undefined) {
      missing.push('evidence.verificationRef')
    } else if (verificationRef !== null && !nonEmpty(verificationRef)) {
      issues.push({recordRef, eventId, code: 'EXP06_VERIFICATION_REF_INVALID'})
    }
    if (verificationStatus === 'VERIFIED_BY_SEPARATE_VERIFIER' && !nonEmpty(verificationRef)) {
      issues.push({recordRef, eventId, code: 'POSITIVE_VERIFICATION_WITHOUT_REFERENCE'})
    }
  }

  const observationQuality = isRecord(quality) ? readOwn(quality, 'status') : undefined
  if (observationQuality === undefined || observationQuality === null || observationQuality === '') {
    missing.push('quality.status')
  } else if (!OBSERVATION_QUALITY_STATUSES.has(observationQuality)) {
    issues.push({recordRef, eventId, code: 'OBSERVATION_QUALITY_STATUS_INVALID'})
  }

  if (issues.length) return {resolutionStatus: 'INVALID', binding: null, issues}
  if (missing.length) {
    return {
      resolutionStatus: 'INCOMPLETE',
      binding: null,
      issues: [{recordRef, eventId, code: 'EXP06_TUPLE_OR_ENVELOPE_INCOMPLETE', missing}],
    }
  }

  return {
    resolutionStatus: 'RESOLVED',
    binding: Object.freeze({
      sourceReference: readOwn(source, 'sourceId'),
      observationReference: readOwn(record, 'eventId'),
      evidenceDigest: readOwn(evidence, 'rawDigestRef'),
      evidenceVersion: readOwn(evidence, 'evidenceVersion'),
      verificationStatus: readOwn(evidence, 'verificationStatus'),
      rawEvidenceRef: readOwn(evidence, 'rawEvidenceRef'),
      verificationRef: readOwn(evidence, 'verificationRef') ?? null,
      profileRef: readOwn(scope, 'profileRef'),
      profileVersion: readOwn(scope, 'profileVersion'),
      observationQualityStatus: observationQuality,
      verificationClaimStatus: 'SOURCE_REPORTED_NOT_INDEPENDENTLY_ASSESSED',
      verificationReferenceStatus: nonEmpty(readOwn(evidence, 'verificationRef'))
        ? 'PRESENT_NOT_RESOLVED'
        : 'NOT_PROVIDED',
    }),
    issues,
  }
}

/**
 * Resolve every OpenExposure observationRefs entry to exactly one ObservationRecord.
 *
 * RESOLVED means only that the envelope reference, profile scope and EXP-06 tuple
 * fields are structurally bound. It does not retrieve raw bytes, recompute a digest,
 * resolve a provider source-operation mapping, resolve a verification artifact,
 * validate a verifier trust root, or establish authority/economic admission.
 */
export function resolveOpenExposureObservationBindings(openExposureSet, observationRecords) {
  if (!isRecord(openExposureSet) || !Array.isArray(observationRecords)) {
    return resolutionResult('INVALID', [], [{code: 'RESOLVER_INPUT_MALFORMED'}], null, null)
  }

  const profileRef = readOwn(openExposureSet, 'profileRef')
  const profileVersion = readOwn(openExposureSet, 'profileVersion')
  if (!nonEmpty(profileRef) || !nonEmpty(profileVersion)) {
    return resolutionResult('INVALID', [], [{code: 'OPEN_EXPOSURE_PROFILE_SCOPE_MISSING'}], profileRef, profileVersion)
  }

  const exposureProjection = classifyOpenExposureSet(openExposureSet)
  if (exposureProjection.qualityStatus !== 'VALID') {
    const status = exposureProjection.qualityStatus === 'INCOMPLETE' ? 'INCOMPLETE' : 'INVALID'
    return resolutionResult(status, [], [{
      code: 'OPEN_EXPOSURE_SET_NOT_RESOLVABLE',
      sourceProjectionStatus: exposureProjection.qualityStatus,
      reason: exposureProjection.reason ?? null,
    }], profileRef, profileVersion)
  }

  const recordsByEventId = new Map()
  for (const record of observationRecords) {
    const eventId = readOwn(record, 'eventId')
    if (!nonEmpty(eventId)) continue
    const records = recordsByEventId.get(eventId) ?? []
    records.push(record)
    recordsByEventId.set(eventId, records)
  }

  let overallStatus = 'RESOLVED'
  const allIssues = []
  const resolvedItems = exposureProjection.grossItems.map(item => {
    let itemStatus = 'RESOLVED'
    const bindings = []
    const itemIssues = []

    for (const eventId of item.observationRefs) {
      const matches = recordsByEventId.get(eventId) ?? []
      if (matches.length === 0) {
        itemStatus = worseStatus(itemStatus, 'INCOMPLETE')
        itemIssues.push({recordRef: item.recordRef, eventId, code: 'OBSERVATION_REFERENCE_NOT_FOUND'})
        continue
      }
      if (matches.length !== 1) {
        itemStatus = worseStatus(itemStatus, 'CONFLICTED')
        itemIssues.push({recordRef: item.recordRef, eventId, code: 'DUPLICATE_OBSERVATION_EVENT_ID', matchCount: matches.length})
        continue
      }

      const inspected = inspectObservationRecord(matches[0], eventId, profileRef, profileVersion, item.recordRef)
      itemStatus = worseStatus(itemStatus, inspected.resolutionStatus)
      if (inspected.binding) bindings.push(inspected.binding)
      itemIssues.push(...inspected.issues)
    }

    overallStatus = worseStatus(overallStatus, itemStatus)
    allIssues.push(...itemIssues)
    return Object.freeze({
      recordRef: item.recordRef,
      resolutionStatus: itemStatus,
      bindings,
      issues: itemIssues,
    })
  })

  return resolutionResult(overallStatus, resolvedItems, allIssues, profileRef, profileVersion)
}
