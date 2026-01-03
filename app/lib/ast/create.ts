/**
 * AST Factory Functions
 *
 * These functions create properly typed AST nodes with sensible defaults.
 * Use these instead of constructing objects manually.
 */

import {
  ASTNode,
  BoundingBox,
  Constraint,
  ConstraintType,
  FormGraph,
  FormGraphMetadata,
  NodeType,
  SemanticParameters,
  SemanticRole,
  SpatialParameters,
} from './types'

// =============================================================================
// ID GENERATION
// =============================================================================

let idCounter = 0

/**
 * Generate a unique ID for a node.
 * In production, consider using UUID or nanoid.
 */
export function generateId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`
}

// =============================================================================
// NODE CREATION
// =============================================================================

export interface CreateNodeOptions {
  id?: string
  role?: SemanticRole
  semantic?: Partial<SemanticParameters>
  spatial?: Partial<SpatialParameters>
  children?: ASTNode[]
  locked?: boolean
  name?: string
}

/**
 * Create an AST node with the given type and options.
 */
export function createNode(
  type: NodeType,
  options: CreateNodeOptions = {}
): ASTNode {
  const now = new Date().toISOString()

  return {
    id: options.id ?? generateId(type.toLowerCase()),
    type,
    role: options.role ?? getDefaultRole(type),
    semantic: {
      openness: 0.5,
      fragility: 0.5,
      mass: 0.5,
      tension: 0.5,
      continuity: 0.5,
      prominence: 0.5,
      ...options.semantic,
    },
    spatial: {
      ...options.spatial,
    },
    children: options.children ?? [],
    locked: options.locked ?? false,
    version: 1,
    meta: {
      name: options.name,
      createdAt: now,
      modifiedAt: now,
      source: 'manual',
    },
  }
}

/**
 * Get the default semantic role for a node type.
 */
function getDefaultRole(type: NodeType): SemanticRole {
  switch (type) {
    case 'Loop':
      return 'holding'
    case 'Stroke':
      return 'flow'
    case 'Mass':
      return 'ground'
    case 'Field':
      return 'negative'
    case 'Container':
      return 'holding'
    case 'TextBlock':
      return 'accent'
    case 'Constraint':
      return 'boundary'
    default:
      return 'accent'
  }
}

// =============================================================================
// TYPED NODE CREATORS
// =============================================================================

/**
 * Create a Loop node (closed curve for containment).
 */
export function createLoop(options: CreateNodeOptions = {}): ASTNode {
  return createNode('Loop', {
    role: 'holding',
    semantic: {
      openness: 0.1,  // Loops are mostly closed
      continuity: 0.9, // Loops are continuous
      ...options.semantic,
    },
    ...options,
  })
}

/**
 * Create a Stroke node (open curve for gesture/direction).
 */
export function createStroke(options: CreateNodeOptions = {}): ASTNode {
  return createNode('Stroke', {
    role: 'flow',
    semantic: {
      openness: 0.8,  // Strokes are open
      fragility: 0.6, // Strokes tend to be lighter
      ...options.semantic,
    },
    ...options,
  })
}

/**
 * Create a Mass node (filled region for weight/presence).
 */
export function createMass(options: CreateNodeOptions = {}): ASTNode {
  return createNode('Mass', {
    role: 'ground',
    semantic: {
      mass: 0.8,      // Masses are heavy
      fragility: 0.2, // Masses are robust
      ...options.semantic,
    },
    ...options,
  })
}

/**
 * Create a Field node (gradient/texture region).
 */
export function createField(options: CreateNodeOptions = {}): ASTNode {
  return createNode('Field', {
    role: 'negative',
    semantic: {
      mass: 0.3,      // Fields are lighter
      fragility: 0.7, // Fields are more delicate
      prominence: 0.3, // Fields are background
      ...options.semantic,
    },
    ...options,
  })
}

/**
 * Create a Container node (semantic grouping).
 */
export function createContainer(options: CreateNodeOptions = {}): ASTNode {
  return createNode('Container', {
    role: 'holding',
    semantic: {
      openness: 0.5,
      ...options.semantic,
    },
    ...options,
  })
}

/**
 * Create a TextBlock node (typography element).
 */
export function createTextBlock(
  text: string,
  options: CreateNodeOptions = {}
): ASTNode {
  const node = createNode('TextBlock', {
    role: 'accent',
    semantic: {
      prominence: 0.7, // Text draws attention
      ...options.semantic,
    },
    ...options,
  })

  // Store text in meta for now
  // In a full implementation, TextBlock would have its own props
  node.meta = {
    ...node.meta,
    name: text,
  }

  return node
}

// =============================================================================
// CONSTRAINT CREATION
// =============================================================================

export interface CreateConstraintOptions {
  id?: string
  priority?: number
  locked?: boolean
}

/**
 * Create a constraint between nodes.
 */
export function createConstraint(
  type: ConstraintType,
  nodeIds: string[],
  value: number | string,
  options: CreateConstraintOptions = {}
): Constraint {
  return {
    id: options.id ?? generateId('constraint'),
    type,
    nodeIds,
    value,
    priority: options.priority ?? 1,
    locked: options.locked ?? false,
  }
}

/**
 * Create a proportion constraint (ratio between dimensions).
 */
export function createProportionConstraint(
  nodeIdA: string,
  nodeIdB: string,
  ratio: number,
  options: CreateConstraintOptions = {}
): Constraint {
  return createConstraint('proportion', [nodeIdA, nodeIdB], ratio, options)
}

/**
 * Create an alignment constraint.
 */
export function createAlignmentConstraint(
  nodeIds: string[],
  edge: 'top' | 'bottom' | 'left' | 'right' | 'center-h' | 'center-v',
  options: CreateConstraintOptions = {}
): Constraint {
  return createConstraint('alignment', nodeIds, edge, options)
}

/**
 * Create a spacing constraint (fixed distance).
 */
export function createSpacingConstraint(
  nodeIdA: string,
  nodeIdB: string,
  distance: number,
  options: CreateConstraintOptions = {}
): Constraint {
  return createConstraint('spacing', [nodeIdA, nodeIdB], distance, options)
}

/**
 * Create a containment constraint (A inside B).
 */
export function createContainmentConstraint(
  innerNodeId: string,
  outerNodeId: string,
  options: CreateConstraintOptions = {}
): Constraint {
  return createConstraint(
    'containment',
    [innerNodeId, outerNodeId],
    'inside',
    options
  )
}

// =============================================================================
// FORM GRAPH CREATION
// =============================================================================

export interface CreateFormGraphOptions {
  id?: string
  name?: string
  parentId?: string
  branch?: string
  tags?: string[]
}

/**
 * Create a FormGraph with the given root node.
 */
export function createFormGraph(
  root: ASTNode,
  constraints: Constraint[] = [],
  options: CreateFormGraphOptions = {}
): FormGraph {
  const now = new Date().toISOString()

  const metadata: FormGraphMetadata = {
    id: options.id ?? generateId('form'),
    name: options.name ?? 'Untitled Form',
    createdAt: now,
    modifiedAt: now,
    version: 1,
    parentId: options.parentId,
    branch: options.branch,
    tags: options.tags,
  }

  return {
    root,
    constraints,
    metadata,
  }
}

/**
 * Create a simple composition for testing.
 * This demonstrates the structure without real geometry.
 */
export function createExampleComposition(): FormGraph {
  // Create a ground mass
  const groundMass = createMass({
    name: 'Ground',
    semantic: { mass: 0.9, fragility: 0.1 },
    spatial: {
      bbox: { x: 50, y: 250, width: 300, height: 80 },
    },
  })

  // Create a holding loop
  const holdingLoop = createLoop({
    name: 'Container Loop',
    semantic: { openness: 0.15, tension: 0.3, continuity: 0.9 },
    spatial: {
      bbox: { x: 100, y: 80, width: 200, height: 150 },
    },
  })

  // Create a tension stroke
  const tensionStroke = createStroke({
    name: 'Tension Line',
    role: 'tension',
    semantic: { fragility: 0.7, tension: 0.85, continuity: 0.6 },
    spatial: {
      bbox: { x: 150, y: 120, width: 100, height: 80 },
    },
  })

  // Create the container with children
  const root = createContainer({
    name: 'Composition Root',
    children: [groundMass, holdingLoop, tensionStroke],
    spatial: {
      bbox: { x: 0, y: 0, width: 400, height: 400 },
    },
  })

  // Create a proportion constraint (golden ratio)
  const proportionConstraint = createProportionConstraint(
    groundMass.id,
    holdingLoop.id,
    0.618, // Golden ratio
    { locked: true }
  )

  return createFormGraph(root, [proportionConstraint], {
    name: 'Example Composition',
    tags: ['example', 'starter'],
  })
}

// =============================================================================
// BOUNDING BOX UTILITIES
// =============================================================================

/**
 * Create a bounding box from position and size.
 */
export function createBBox(
  x: number,
  y: number,
  width: number,
  height: number
): BoundingBox {
  return { x, y, width, height }
}

/**
 * Create a bounding box centered at a point.
 */
export function createCenteredBBox(
  centerX: number,
  centerY: number,
  width: number,
  height: number
): BoundingBox {
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}
