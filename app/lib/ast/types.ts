/**
 * Semantic Form Learner - AST Type Definitions
 *
 * This module defines the Abstract Syntax Tree for representing
 * visual compositions as structured, semantic data.
 *
 * Key principle: The AST captures MEANING and STRUCTURE, not pixels.
 * SVG is a derived artifact that can be regenerated deterministically.
 */

// =============================================================================
// SEMANTIC ROLES
// =============================================================================

/**
 * SemanticRole describes the PURPOSE of a form element within a composition.
 * These are the "interior meanings" that persist across visual variations.
 */
export type SemanticRole =
  | 'ground'      // Anchoring mass that stabilizes the composition
  | 'holding'     // Containment or embrace; creates interior space
  | 'tension'     // Dynamic opposition; creates energy
  | 'flow'        // Directional movement; guides the eye
  | 'accent'      // Emphasis point; draws attention
  | 'boundary'    // Edge definition; separates regions
  | 'negative'    // Intentional emptiness; breathing room

// =============================================================================
// NODE TYPES
// =============================================================================

/**
 * NodeType defines the STRUCTURAL category of a form element.
 * Each type has specific geometric behaviors and parameter meanings.
 */
export type NodeType =
  | 'Loop'        // Closed curve - containment, wholeness, cycles
  | 'Stroke'      // Open curve - gesture, direction, connection
  | 'Mass'        // Filled region - weight, presence, solidity
  | 'Field'       // Gradient/texture region - atmosphere, transition
  | 'Container'   // Semantic grouping - hierarchy, relationship
  | 'TextBlock'   // Typography element - language, naming
  | 'Constraint'  // Relationship rule - proportion, alignment

// =============================================================================
// PARAMETERS
// =============================================================================

/**
 * Semantic parameters - these are the LEARNABLE surface.
 * They describe qualities, not geometry. The compiler maps these to SVG.
 *
 * All parameters are normalized to [0, 1] range for consistency.
 */
export interface SemanticParameters {
  /**
   * Openness: How closed or open the form is.
   * 0 = fully closed/contained, 1 = fully open/expansive
   * Applies to: Loop (closure), Stroke (termination), Container (boundary)
   */
  openness?: number

  /**
   * Fragility: How delicate or robust the form appears.
   * 0 = robust/heavy/permanent, 1 = delicate/light/ephemeral
   * Affects: stroke width, opacity, dash patterns
   */
  fragility?: number

  /**
   * Mass: Visual weight and presence.
   * 0 = lightweight/airy, 1 = heavy/grounded
   * Affects: fill opacity, size, vertical position bias
   */
  mass?: number

  /**
   * Tension: Dynamic energy in the form.
   * 0 = relaxed/soft, 1 = taut/sharp
   * Affects: curve tightness, corner radius, control point distance
   */
  tension?: number

  /**
   * Continuity: Flow and smoothness.
   * 0 = broken/segmented, 1 = flowing/continuous
   * Affects: stroke-linecap, segment connections, dash patterns
   */
  continuity?: number

  /**
   * Prominence: How much the element demands attention.
   * 0 = recessive/background, 1 = dominant/foreground
   * Affects: z-index, contrast, size relative to siblings
   */
  prominence?: number
}

/**
 * Spatial parameters - derived during compilation or set explicitly.
 * These define WHERE the form exists, separate from WHAT it means.
 */
export interface SpatialParameters {
  /**
   * Bounding box in canvas coordinates.
   * Can be explicitly set or computed from content.
   */
  bbox?: BoundingBox

  /**
   * Anchor point for positioning relative to parent.
   */
  anchor?: AnchorPoint

  /**
   * Rotation in radians.
   */
  rotation?: number

  /**
   * Scale factor relative to default size.
   */
  scale?: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type AnchorPoint =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

// =============================================================================
// AST NODE
// =============================================================================

/**
 * ASTNode is the core building block of the form graph.
 * Every visual element is represented as a node with semantic meaning.
 */
export interface ASTNode {
  /**
   * Unique identifier for this node.
   * Used for references, constraints, and tracking.
   */
  id: string

  /**
   * Structural type of this node.
   */
  type: NodeType

  /**
   * Semantic role within the composition.
   */
  role: SemanticRole

  /**
   * Semantic parameters (the learnable surface).
   */
  semantic: SemanticParameters

  /**
   * Spatial parameters (position, size, rotation).
   */
  spatial: SpatialParameters

  /**
   * Child nodes (for Container and other grouping types).
   */
  children: ASTNode[]

  /**
   * Whether this node's parameters are locked from learning.
   * Locked nodes preserve their values across preference updates.
   */
  locked: boolean

  /**
   * Version number for diffing and history tracking.
   * Incremented on each modification.
   */
  version: number

  /**
   * Optional metadata for debugging and tooling.
   */
  meta?: NodeMetadata
}

export interface NodeMetadata {
  /**
   * Human-readable name for the node.
   */
  name?: string

  /**
   * Creation timestamp.
   */
  createdAt?: string

  /**
   * Last modification timestamp.
   */
  modifiedAt?: string

  /**
   * Source of this node (manual, generated, imported).
   */
  source?: 'manual' | 'generated' | 'imported'

  /**
   * Arbitrary tags for organization.
   */
  tags?: string[]
}

// =============================================================================
// CONSTRAINTS
// =============================================================================

/**
 * Constraints define relationships between nodes that must be preserved.
 * They are the "brand invariants" - rules that learning cannot violate.
 */
export interface Constraint {
  /**
   * Unique identifier for this constraint.
   */
  id: string

  /**
   * Type of constraint.
   */
  type: ConstraintType

  /**
   * Node IDs involved in this constraint.
   */
  nodeIds: string[]

  /**
   * Constraint value (interpretation depends on type).
   */
  value: number | string

  /**
   * Priority for conflict resolution (higher = more important).
   */
  priority: number

  /**
   * Whether this constraint is locked (cannot be relaxed by learning).
   */
  locked: boolean
}

export type ConstraintType =
  | 'proportion'    // Ratio between node dimensions
  | 'alignment'     // Nodes share an edge or center
  | 'spacing'       // Fixed distance between nodes
  | 'containment'   // One node must be inside another
  | 'symmetry'      // Nodes mirror across an axis
  | 'hierarchy'     // Visual prominence ordering

// =============================================================================
// FORM GRAPH
// =============================================================================

/**
 * FormGraph is the complete representation of a design.
 * It contains the AST root, constraints, and metadata.
 */
export interface FormGraph {
  /**
   * Root node of the AST (typically a Container).
   */
  root: ASTNode

  /**
   * Global constraints across the composition.
   */
  constraints: Constraint[]

  /**
   * Metadata about this form graph.
   */
  metadata: FormGraphMetadata
}

export interface FormGraphMetadata {
  /**
   * Unique identifier for this form graph.
   */
  id: string

  /**
   * Human-readable name.
   */
  name: string

  /**
   * Creation timestamp.
   */
  createdAt: string

  /**
   * Last modification timestamp.
   */
  modifiedAt: string

  /**
   * Version number for the entire graph.
   */
  version: number

  /**
   * Parent form graph ID (for branching/versioning).
   */
  parentId?: string

  /**
   * Branch name (if this is a variant branch).
   */
  branch?: string

  /**
   * Tags for organization.
   */
  tags?: string[]
}

// =============================================================================
// SELECTION & PREFERENCE DATA
// =============================================================================

/**
 * SelectionRecord captures a preference learning event.
 * These records are the training data for the preference model.
 */
export interface SelectionRecord {
  /**
   * Unique identifier for this selection event.
   */
  id: string

  /**
   * The anchor form graph (what variants were generated from).
   */
  anchor: FormGraph

  /**
   * The variants that were presented.
   */
  variants: FormGraph[]

  /**
   * User's ranking of variants (indices into variants array).
   * First element is most preferred.
   */
  rankings: number[]

  /**
   * Timestamp of the selection.
   */
  timestamp: string

  /**
   * Optional context about why this selection was made.
   */
  context?: string
}

/**
 * PreferenceModel represents learned taste.
 * This is what accumulates over time from selections.
 */
export interface PreferenceModel {
  /**
   * Model identifier.
   */
  id: string

  /**
   * Number of selection records used to train this model.
   */
  trainingSize: number

  /**
   * Parameter weights (which semantic parameters matter most).
   */
  parameterWeights: Record<keyof SemanticParameters, number>

  /**
   * Role preferences (which semantic roles are favored).
   */
  rolePreferences: Record<SemanticRole, number>

  /**
   * Constraint strictness (how much to enforce constraints).
   */
  constraintStrictness: number

  /**
   * Last training timestamp.
   */
  trainedAt: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Diff between two form graphs.
 * Used for version comparison and history visualization.
 */
export interface FormGraphDiff {
  /**
   * Nodes added in the new version.
   */
  added: ASTNode[]

  /**
   * Nodes removed from the old version.
   */
  removed: ASTNode[]

  /**
   * Nodes with changed parameters.
   */
  modified: Array<{
    nodeId: string
    before: Partial<ASTNode>
    after: Partial<ASTNode>
  }>

  /**
   * Constraints added.
   */
  constraintsAdded: Constraint[]

  /**
   * Constraints removed.
   */
  constraintsRemoved: Constraint[]
}

/**
 * Result of compiling a FormGraph to SVG.
 */
export interface CompileResult {
  /**
   * The SVG string.
   */
  svg: string

  /**
   * The SVG as a DOM element (for direct manipulation).
   */
  element: SVGSVGElement

  /**
   * Mapping from node IDs to SVG element IDs.
   */
  nodeToElement: Map<string, string>

  /**
   * Any warnings generated during compilation.
   */
  warnings: string[]
}
