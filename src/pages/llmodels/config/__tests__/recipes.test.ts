import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RecipeFeature,
  RecipeVariant,
  defaultFeatureChoices
} from '../recipes';

const feature = (
  name: string,
  overrides: Partial<RecipeFeature> = {}
): RecipeFeature => ({
  name,
  backend: 'vLLM',
  description: '',
  default: true,
  args: [],
  env: {},
  modes: [],
  default_mode: null,
  requires_hf_access: false,
  ...overrides
});

const variant = (overrides: Partial<RecipeVariant> = {}) =>
  ({
    name: 'vllm:default:h200:single_node_tp',
    backend: 'vLLM',
    features: ['tool_calling', 'spec_decoding'],
    default_features: ['tool_calling'],
    default_modes: {},
    ...overrides
  }) as RecipeVariant;

test('a variant starts with the features its upstream command carried', () => {
  const choices = defaultFeatureChoices(variant(), [
    feature('tool_calling'),
    feature('spec_decoding', { default: false })
  ]);

  assert.deepEqual(choices, {
    tool_calling: { enabled: true, mode: null },
    spec_decoding: { enabled: false, mode: null }
  });
});

test('a moded feature starts in the mode upstream ran it in', () => {
  const spec = feature('spec_decoding', {
    default_mode: 'mtp',
    modes: [
      { name: 'mtp', label: 'MTP', description: '', args: [], env: {} },
      { name: 'eagle3', label: 'EAGLE3', description: '', args: [], env: {} }
    ]
  });

  assert.equal(
    defaultFeatureChoices(
      variant({
        default_features: ['spec_decoding'],
        default_modes: { spec_decoding: 'eagle3' }
      }),
      [spec]
    ).spec_decoding.mode,
    'eagle3'
  );
  assert.equal(
    defaultFeatureChoices(variant(), [spec]).spec_decoding.mode,
    'mtp'
  );
});

test("another backend's features and ones the variant lacks are not offered", () => {
  const choices = defaultFeatureChoices(variant(), [
    feature('tool_calling', { backend: 'SGLang' }),
    feature('text_only')
  ]);

  assert.deepEqual(choices, {});
});
