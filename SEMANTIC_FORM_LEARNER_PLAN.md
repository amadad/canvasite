# Semantic Form Learner: Research, Evaluation & Implementation Plan

## Executive Summary

This document outlines the transformation of Canvasite from a sketch-to-HTML prototype tool into a **Semantic Form Learner**—a system that maps meaning → structure → form, accumulates designer taste over time, and outputs SVG with typed form graphs.

---

## Part 1: Research Findings

### 1.1 Current System Architecture

**Pipeline**: `Sketch → tldraw SVG → PNG → GPT-4o-mini → HTML → iframe`

| Component | File | Purpose |
|-----------|------|---------|
| Canvas | `app/page.tsx` | tldraw editor with custom shapes |
| Orchestrator | `app/lib/makeReal.tsx` | Captures selection, calls AI, creates preview |
| AI Integration | `app/lib/getHtmlFromOpenAI.ts` | Multi-modal prompt to GPT-4o-mini |
| Preview Shape | `app/PreviewShape/PreviewShape.tsx` | Custom tldraw shape rendering HTML in iframe |
| Prompts | `app/prompt.ts` | System/user prompts for HTML generation |

**Key Insight**: The current system collapses structure immediately—there's no intermediate representation to learn from. The output (HTML) is a terminal artifact, not a diffable structure.

### 1.2 Research Frontier (2024-2025)

#### Chat2SVG (CVPR 2025)
- **Approach**: LLM generates SVG templates from primitives → SDEdit enhancement → dual-stage optimization
- **Key insight**: Constrains to basic primitives (rect, ellipse, line, polyline, polygon, short paths) because LLMs struggle with complex geometry
- **Relevance**: Validates that LLM → structured SVG is viable, but needs primitive constraints
- [GitHub](https://github.com/kingnobro/Chat2SVG) | [Paper](https://openaccess.thecvf.com/content/CVPR2025/papers/Wu_Chat2SVG_Vector_Graphics_Generation_with_Large_Language_Models_and_Image_CVPR_2025_paper.pdf)

#### OmniSVG (NeurIPS 2025)
- **Approach**: Vision-Language Model with SVG tokenizer; parameterizes commands/coordinates into discrete tokens
- **Key insight**: Decouples structural logic from low-level geometry
- **Relevance**: Proves that structure ↔ geometry decoupling works at scale
- [GitHub](https://github.com/OmniSVG/OmniSVG) | [arXiv](https://arxiv.org/abs/2504.06263)

#### StarVector, SVGen, SuperSVG
- Component-based and explicit reasoning architectures outperform pixel-level diffusion
- SVGen uses Chain-of-Thought for step-by-step design reasoning
- SuperSVG uses hierarchical coarse-to-fine generation

#### Preference Learning (RLHF/DPO)
- **Direct Preference Optimization (DPO)**: Avoids explicit reward model, optimizes directly from pairwise comparisons
- **Key formats**: Pairwise comparisons, scalar ratings, Bradley-Terry-Luce model
- **Relevance**: We can learn taste from (anchor, variant_A, variant_B, choice) tuples without complex RL

### 1.3 White Space Validation

The research confirms your competitive analysis:

| White Space | Research Support |
|-------------|------------------|
| Preference learning over typed form graph | No research productizes this—all focus on generation, not taste accumulation |
| Meaning → structure explicit controls | Chat2SVG/OmniSVG treat structure as means to end, not semantic layer |
| Personal canon as training data | All models train on public datasets, not personal selection history |
| Structural safety for brand invariants | No constraint enforcement in current SVG generators |

---

## Part 2: Evaluation

### 2.1 Reusable Components

| Component | Verdict | Rationale |
|-----------|---------|-----------|
| tldraw canvas | **KEEP** | Excellent shape infrastructure, persistence, editor API |
| Custom shape pattern | **KEEP** | `PreviewShapeUtil` pattern works for AST-based shapes |
| Next.js/React setup | **KEEP** | No need to change framework |
| Shape traversal utilities | **KEEP** | `getShapeAndDescendantIds`, bounds queries useful |
| SVG export pipeline | **ADAPT** | Keep `editor.getSvg()`, replace destination |
| TypeScript types | **KEEP** | Strong typing essential for AST work |

### 2.2 Components to Replace

| Component | Replacement |
|-----------|-------------|
| `getHtmlFromOpenAI.ts` | AST → SVG compiler (deterministic, no AI) |
| `prompt.ts` | Semantic node type definitions |
| `PreviewShape` (HTML iframe) | `FormShape` (SVG renderer from AST) |
| `makeReal.tsx` orchestrator | `compileToSVG.tsx` + `generateVariants.tsx` |
| OpenAI dependency | Remove for core; optional for semantic parsing |

### 2.3 tldraw as AST Platform

tldraw's shape model maps well to AST concepts:

| tldraw Concept | AST Equivalent |
|----------------|----------------|
| Shape type (`'geo'`, `'text'`) | Node type (`'Loop'`, `'Mass'`) |
| Shape props | Node parameters |
| Shape children (groups) | AST children |
| Shape ID | Node ID |
| `getShapeAndDescendantIds()` | Tree traversal |
| `editor.createShape()` | AST node creation |
| `editor.updateShape()` | AST mutation |
| Persistence (`persistenceKey`) | AST versioning foundation |

**Key advantage**: tldraw already handles persistence, undo/redo, and collaborative state—we inherit this for AST operations.

---

## Part 3: Minimal AST Schema Design

### 3.1 Core Node Types (Phase 1)

```typescript
// app/lib/ast/types.ts

export type SemanticRole =
  | 'ground'      // anchoring mass
  | 'holding'     // containment
  | 'tension'     // dynamic opposition
  | 'flow'        // directional movement
  | 'accent'      // emphasis point
  | 'boundary'    // edge definition
  | 'negative'    // intentional emptiness

export type NodeType =
  | 'Loop'        // closed curve (containment, wholeness)
  | 'Stroke'      // open curve (gesture, direction)
  | 'Mass'        // filled region (weight, presence)
  | 'Field'       // gradient/texture region
  | 'Container'   // grouping with semantic meaning
  | 'TextBlock'   // typography element
  | 'Constraint'  // relationship rule

export interface ASTNode {
  id: string
  type: NodeType
  role: SemanticRole
  parameters: NodeParameters
  children: ASTNode[]
  locked: boolean           // prevent learning from changing this
  version: number           // for diffing
}

export interface NodeParameters {
  // Semantic parameters (the "interior meaning")
  openness?: number        // 0 = closed, 1 = open (for Loop/Stroke)
  fragility?: number       // 0 = robust, 1 = delicate
  mass?: number            // 0 = light, 1 = heavy
  tension?: number         // 0 = relaxed, 1 = taut
  continuity?: number      // 0 = broken, 1 = flowing

  // Spatial parameters (derived during compilation)
  bbox?: BoundingBox
  anchor?: 'top' | 'center' | 'bottom' | 'left' | 'right'
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FormGraph {
  root: ASTNode
  metadata: {
    id: string
    name: string
    createdAt: string
    version: number
    parentId?: string       // for branching
  }
  constraints: Constraint[]
}

export interface Constraint {
  id: string
  type: 'proportion' | 'alignment' | 'spacing' | 'containment'
  nodeIds: string[]
  value: number | string
  locked: boolean
}
```

### 3.2 Example AST Instance

```json
{
  "root": {
    "id": "root-1",
    "type": "Container",
    "role": "ground",
    "parameters": { "mass": 0.8 },
    "locked": false,
    "version": 1,
    "children": [
      {
        "id": "mass-1",
        "type": "Mass",
        "role": "ground",
        "parameters": {
          "mass": 0.9,
          "fragility": 0.1,
          "bbox": { "x": 0, "y": 200, "width": 400, "height": 100 }
        },
        "children": [],
        "locked": false,
        "version": 1
      },
      {
        "id": "loop-1",
        "type": "Loop",
        "role": "holding",
        "parameters": {
          "openness": 0.15,
          "tension": 0.3,
          "continuity": 0.9
        },
        "children": [],
        "locked": false,
        "version": 1
      },
      {
        "id": "stroke-1",
        "type": "Stroke",
        "role": "tension",
        "parameters": {
          "fragility": 0.7,
          "tension": 0.85,
          "continuity": 0.6
        },
        "children": [],
        "locked": false,
        "version": 1
      }
    ]
  },
  "metadata": {
    "id": "form-001",
    "name": "Brand Mark v1",
    "createdAt": "2025-01-03T00:00:00Z",
    "version": 1
  },
  "constraints": [
    {
      "id": "c-1",
      "type": "proportion",
      "nodeIds": ["mass-1", "loop-1"],
      "value": 0.618,
      "locked": true
    }
  ]
}
```

---

## Part 4: Implementation Plan

### Phase 0: Reframe (Day 1)

**Goal**: Lock in mental model

- [ ] Replace README with new vision statement
- [ ] Create `app/lib/ast/` directory structure
- [ ] Document the equation: `meaning → structure → form`

**Deliverable**: Clear articulation that this is NOT a generator—it's a semantic form compiler with preference learning.

---

### Phase 1: Minimal AST (Days 2-6)

**Goal**: Represent ONE composition as structured data

**Tasks**:
1. Create type definitions (`app/lib/ast/types.ts`)
2. Create AST factory functions (`app/lib/ast/create.ts`)
3. Create AST traversal utilities (`app/lib/ast/traverse.ts`)
4. Create JSON schema for validation (`app/lib/ast/schema.json`)
5. Create test fixtures with example ASTs

**Directory Structure**:
```
app/lib/ast/
├── types.ts           # Core type definitions
├── create.ts          # Factory functions
├── traverse.ts        # Tree traversal utilities
├── validate.ts        # Schema validation
├── schema.json        # JSON Schema
└── __tests__/
    └── ast.test.ts    # Unit tests
```

**Validation**: Can create, serialize, deserialize, and validate an AST representing a simple composition.

---

### Phase 2: AST → SVG Compiler (Days 7-14)

**Goal**: Deterministic rendering from AST

**Tasks**:
1. Create compiler entry point (`app/lib/compiler/compile.ts`)
2. Implement node-specific renderers:
   - `renderLoop.ts` → SVG `<path>` (closed)
   - `renderStroke.ts` → SVG `<path>` (open)
   - `renderMass.ts` → SVG `<rect>` / `<ellipse>` / `<path>`
   - `renderField.ts` → SVG with gradients
   - `renderContainer.ts` → SVG `<g>` with transforms
   - `renderTextBlock.ts` → SVG `<text>`
3. Implement parameter → geometry mapping
4. Ensure idempotency: same AST → same SVG every time

**Directory Structure**:
```
app/lib/compiler/
├── compile.ts         # Main entry point
├── renderers/
│   ├── loop.ts
│   ├── stroke.ts
│   ├── mass.ts
│   ├── field.ts
│   ├── container.ts
│   └── text.ts
├── geometry/
│   ├── curves.ts      # Bezier generation
│   ├── shapes.ts      # Primitive shapes
│   └── layout.ts      # Spatial calculations
└── __tests__/
    └── compiler.test.ts
```

**Validation**: Given an AST fixture, compiler produces identical SVG on every run.

---

### Phase 3: Semantic Handles (Days 15-19)

**Goal**: Map semantic parameters to geometry

**Tasks**:
1. Define parameter-to-geometry mappings:
   - `openness` → curve closure percentage
   - `fragility` → stroke width, dash pattern
   - `mass` → fill opacity, size scaling
   - `tension` → curve tautness (control point distance)
   - `continuity` → stroke-linecap, segment smoothness
2. Create parameter interpolation functions
3. Implement constraint solver for relationships
4. Add visual debugging (parameter overlays)

**Key Insight**: This is where "interior meaning enters the system." The semantic parameters are the learnable surface.

**Validation**: Changing `fragility` from 0.1 to 0.9 produces visibly different (but structurally identical) output.

---

### Phase 4: Variation Generation (Days 20-27)

**Goal**: Generate variants without ML

**Tasks**:
1. Create variant generator (`app/lib/variants/generate.ts`)
2. Implement parameter perturbation strategies:
   - Random within bounds
   - Latin hypercube sampling
   - Gradient-based exploration
3. Create variant grid UI component
4. Implement selection/ranking interface
5. Store selection data:
   ```typescript
   interface SelectionRecord {
     anchor: FormGraph
     variants: FormGraph[]
     rankings: number[]  // user's preference order
     timestamp: string
   }
   ```

**Directory Structure**:
```
app/lib/variants/
├── generate.ts        # Variant generation
├── strategies/
│   ├── random.ts
│   ├── lhs.ts         # Latin hypercube
│   └── gradient.ts
├── ui/
│   └── VariantGrid.tsx
└── storage/
    └── selections.ts
```

**Validation**: System generates 8-16 variants, user can rank them, selections are persisted.

---

### Phase 5: Preference Learning (Days 28-35)

**Goal**: Train preference model from selection history

**Tasks**:
1. Implement Bradley-Terry preference model
2. Create training pipeline from selection records
3. Implement DPO-style direct optimization (no explicit reward model)
4. Create preference scoring function:
   ```typescript
   function scoreVariant(anchor: FormGraph, variant: FormGraph): number
   ```
5. Integrate with variant generation (bias toward preferred regions)

**Key Insight**: We're learning `P(prefer A over B | anchor)`, not generating from scratch.

**Directory Structure**:
```
app/lib/preference/
├── model.ts           # Preference model
├── train.ts           # Training from selections
├── score.ts           # Scoring function
└── __tests__/
    └── preference.test.ts
```

**Validation**: After 20+ selections, system's top-ranked variants align with user's historical preferences.

---

### Phase 6: Guided Generation (Days 36-42)

**Goal**: Use preference model to improve suggestions

**Tasks**:
1. Integrate preference scoring into variant generation
2. Implement pruning of low-scoring branches
3. Create "suggest edit" functionality
4. Build preference-weighted parameter search
5. Add "lock" feature for approved parameters

**Validation**: Subsequent variant sets show higher alignment with learned preferences.

---

### Phase 7: tldraw Integration (Days 43-50)

**Goal**: Full canvas integration

**Tasks**:
1. Create `FormShapeUtil` extending `BaseBoxShapeUtil`
2. Render SVG from AST in shape component
3. Enable direct parameter manipulation on canvas
4. Implement AST ↔ tldraw shape synchronization
5. Add branching/versioning UI
6. Implement diff visualization between versions

**Replaces**: Current `PreviewShapeUtil` (HTML iframe) with native SVG rendering from AST.

---

## Part 5: Technical Decisions

### Why NOT Use LLMs for Generation

| Reason | Explanation |
|--------|-------------|
| Structure collapse | LLMs output flat SVG, not semantic structure |
| Non-determinism | Same prompt → different output |
| No credit assignment | Can't identify which decisions caused preference |
| Training data | Public datasets, not personal taste |

### Why JSON for AST (Not DSL)

- **Tooling**: Native TypeScript/JavaScript interop
- **Persistence**: tldraw already uses JSON for shapes
- **Debugging**: Human-readable, diffable
- **Validation**: JSON Schema support
- **Portability**: Export/import between systems

### Why Bradley-Terry for Preferences

- **Simplicity**: Only needs pairwise comparisons
- **Efficiency**: Works with small datasets (dozens, not thousands)
- **Interpretability**: Clear probability semantics
- **Composability**: Can extend to partial rankings (Plackett-Luce)

---

## Part 6: Success Criteria

### Phase 1 Exit
- [ ] Can create AST with 5+ node types
- [ ] AST serializes/deserializes without loss
- [ ] Validation catches malformed ASTs

### Phase 2 Exit
- [ ] Compiler produces valid SVG
- [ ] Same AST → identical SVG (100% reproducible)
- [ ] All node types render correctly

### Phase 3 Exit
- [ ] Semantic parameters visibly affect output
- [ ] Parameter changes are smooth/interpolatable
- [ ] Constraints are enforced

### Phase 4 Exit
- [ ] Can generate 16 variants from single AST
- [ ] User can rank variants
- [ ] Selections are persisted

### Phase 5 Exit
- [ ] Preference model trains from 20+ selections
- [ ] Scoring correlates with held-out preferences (>70%)

### Phase 6 Exit
- [ ] Guided variants score higher than random
- [ ] User reports faster convergence to desired forms

---

## Appendix A: File Changes Summary

### Files to Create
```
app/lib/ast/types.ts
app/lib/ast/create.ts
app/lib/ast/traverse.ts
app/lib/ast/validate.ts
app/lib/ast/schema.json
app/lib/compiler/compile.ts
app/lib/compiler/renderers/*.ts
app/lib/compiler/geometry/*.ts
app/lib/variants/generate.ts
app/lib/variants/strategies/*.ts
app/lib/preference/model.ts
app/lib/preference/train.ts
app/lib/preference/score.ts
app/components/VariantGrid.tsx
app/components/FormShape/FormShapeUtil.tsx
```

### Files to Modify
```
app/page.tsx           # Register new shape types
app/globals.css        # New component styles
package.json           # Add testing dependencies
```

### Files to Remove (Eventually)
```
app/lib/getHtmlFromOpenAI.ts
app/lib/makeReal.tsx
app/prompt.ts
app/PreviewShape/PreviewShape.tsx
app/components/RiskyButCoolAPIKeyInput.tsx
```

---

## Appendix B: Research Sources

- [Chat2SVG - CVPR 2025](https://github.com/kingnobro/Chat2SVG)
- [OmniSVG - NeurIPS 2025](https://github.com/OmniSVG/OmniSVG)
- [StarVector - CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/papers/Rodriguez_StarVector_Generating_Scalable_Vector_Graphics_Code_from_Images_and_Text_CVPR_2025_paper.pdf)
- [SVGen - 2025](https://arxiv.org/pdf/2508.09168)
- [Direct Preference Optimization](http://www.columbia.edu/~wt2319/Preference_survey.pdf)
- [Bradley-Terry Model](https://en.wikipedia.org/wiki/Preference_learning)
