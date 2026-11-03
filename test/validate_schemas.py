from pathlib import Path
import json
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def validate(schema_path, instance_path):
    schema = load(ROOT / schema_path)
    instance = load(ROOT / instance_path)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    if errors:
        joined = "\n".join(f"{list(e.path)}: {e.message}" for e in errors)
        raise AssertionError(f"{instance_path} failed {schema_path}:\n{joined}")
    print(f"PASS {instance_path} validates against {schema_path}")

validate("schemas/fixture-pack.schema.json", "fixtures/arb-s1-fixture.v0.1.json")
validate("schemas/observation-record.schema.json", "examples/observation-record.synthetic.json")
validate("schemas/replay-manifest.schema.json", "examples/replay-manifest.synthetic.json")
validate("schemas/replay-result.schema.json", "examples/replay-result.synthetic.json")
validate("schemas/multistream-replay-result.schema.json", "examples/multistream-replay-result.synthetic.json")
validate("schemas/open-exposure-set.schema.json", "examples/open-exposure-set.synthetic.json")
