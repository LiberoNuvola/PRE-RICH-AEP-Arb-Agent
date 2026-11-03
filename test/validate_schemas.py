from copy import deepcopy
from pathlib import Path
import json

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validator_for(schema_path):
    schema = load(ROOT / schema_path)
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def validate(schema_path, instance_path):
    instance = load(ROOT / instance_path)
    validator = validator_for(schema_path)
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    if errors:
        joined = "\n".join(f"{list(e.path)}: {e.message}" for e in errors)
        raise AssertionError(f"{instance_path} failed {schema_path}:\n{joined}")
    print(f"PASS {instance_path} validates against {schema_path}")
    return instance


def assert_rejected(validator, instance, label):
    errors = list(validator.iter_errors(instance))
    if not errors:
        raise AssertionError(f"{label}: invalid evidence claim was accepted")
    print(f"PASS {label} is rejected")


def validate_manifest_stream_coverage(instance_path):
    manifest = load(ROOT / instance_path)
    stream_ids = [entry["streamId"] for entry in manifest["streams"]]
    checkpoint_ids = [entry["streamId"] for entry in manifest["initialCheckpoints"]]
    if len(stream_ids) != len(set(stream_ids)):
        raise AssertionError(f"{instance_path}: duplicate streamId in streams")
    if len(checkpoint_ids) != len(set(checkpoint_ids)):
        raise AssertionError(f"{instance_path}: duplicate streamId in initialCheckpoints")
    if set(stream_ids) != set(checkpoint_ids):
        raise AssertionError(f"{instance_path}: every stream must have exactly one initial checkpoint")
    checkpoints = {item["streamId"]: item for item in manifest["initialCheckpoints"]}
    for stream in manifest["streams"]:
        checkpoint = checkpoints[stream["streamId"]]
        if stream["startSequenceExclusive"] != checkpoint["coveredThroughSequence"]:
            raise AssertionError(
                f"{instance_path}: checkpoint cursor does not match stream start for {stream['streamId']}"
            )
    print(f"PASS {instance_path} has exactly one matching checkpoint per stream")


def validate_coverage_family_uniqueness(report, label):
    families = [item["dataFamily"] for item in report["coverageItems"]]
    if len(families) != len(set(families)):
        raise AssertionError(f"{label}: duplicate dataFamily coverage entries")
    print(f"PASS {label} has unique per-family coverage records")


validate("schemas/fixture-pack.schema.json", "fixtures/arb-s1-fixture.v0.1.json")
validate("schemas/observation-record.schema.json", "examples/observation-record.synthetic.json")
validate("schemas/replay-manifest.schema.json", "examples/replay-manifest.synthetic.json")
validate_manifest_stream_coverage("examples/replay-manifest.synthetic.json")
validate("schemas/replay-manifest.schema.json", "examples/multistream-replay-manifest.synthetic.json")
validate_manifest_stream_coverage("examples/multistream-replay-manifest.synthetic.json")
validate("schemas/replay-result.schema.json", "examples/replay-result.synthetic.json")
validate("schemas/multistream-replay-result.schema.json", "examples/multistream-replay-result.synthetic.json")
validate("schemas/open-exposure-set.schema.json", "examples/open-exposure-set.synthetic.json")

provider_profile = validate(
    "schemas/provider-profile.schema.json",
    "examples/provider-profile.template.json"
)
coverage_report = validate(
    "schemas/collection-coverage.schema.json",
    "examples/collection-coverage.synthetic.json"
)
validate_coverage_family_uniqueness(coverage_report, "synthetic collection coverage report")

coverage_validator = validator_for("schemas/collection-coverage.schema.json")
invalid_empty_not_exhausted = deepcopy(coverage_report)
invalid_empty_not_exhausted["coverageItems"][1]["paginationStatus"] = "NOT_EXHAUSTED"
assert_rejected(
    coverage_validator,
    invalid_empty_not_exhausted,
    "COMPLETE_EMPTY without exhausted pagination"
)

invalid_empty_with_records = deepcopy(coverage_report)
invalid_empty_with_records["coverageItems"][1]["recordCount"] = 1
assert_rejected(
    coverage_validator,
    invalid_empty_with_records,
    "COMPLETE_EMPTY with a non-zero record count"
)

invalid_missing_snapshot_boundary = deepcopy(coverage_report)
invalid_missing_snapshot_boundary["coverageItems"][1]["boundary"] = {
    "kind": "UNKNOWN",
    "reference": None,
    "atomicity": "UNKNOWN"
}
assert_rejected(
    coverage_validator,
    invalid_missing_snapshot_boundary,
    "COMPLETE_EMPTY without a documented query/snapshot boundary"
)

invalid_not_requested = deepcopy(coverage_report)
invalid_not_requested["coverageItems"][3]["requested"] = True
assert_rejected(
    coverage_validator,
    invalid_not_requested,
    "NOT_REQUESTED marked as requested"
)

provider_validator = validator_for("schemas/provider-profile.schema.json")
invalid_reviewable_profile = deepcopy(provider_profile)
invalid_reviewable_profile["status"] = "REVIEWABLE"
assert_rejected(
    provider_validator,
    invalid_reviewable_profile,
    "REVIEWABLE ProviderProfile without provider identity and documentation"
)

invalid_authority_boundary = deepcopy(provider_profile)
invalid_authority_boundary["authorityBoundary"]["canSetPrincipalAuthority"] = True
assert_rejected(
    provider_validator,
    invalid_authority_boundary,
    "ProviderProfile attempting to set Principal authority"
)
