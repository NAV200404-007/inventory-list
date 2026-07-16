import type { EventBoxCategory } from '../types'

const standardBoxChecklist: EventBoxCategory[] = [
  {
    id: 'basebot',
    name: 'BaseBot',
    parts: [
      ['center-offset-round-lock-beam', 'Center Offset Round Lock Beam', 4],
      ['travel-tire', 'Travel Tire', 2],
      ['travel-omni-directional-wheel', 'Travel Omni-Directional Wheel', 2],
      ['triple-corner-connector', 'Triple 2x Wide 2x2 Corner Connector', 8],
      ['offset-corner-connector', '2x Wide 2x2 Offset Corner Connector', 4],
      ['robot-brain', 'Robot Brain', 1],
      ['robot-battery', 'Robot Battery', 1, 'Not included in standard project boxes.'],
      ['controller', 'Controller', 1, 'Not included in standard project boxes.'],
      ['smart-motor', 'Smart Motor', 2],
      ['200mm-smart-cable', '200mm Smart Cable', 2],
      ['2x2-beam', '2x2 Beam', 4],
      ['2x8-beam', '2x8 Beam', 2],
      ['2x12-beam', '2x12 Beam', 6],
    ].map(([id, name, expectedQuantity, note]) => ({
      id: String(id),
      name: String(name),
      expectedQuantity: Number(expectedQuantity),
      returnedQuantity: null,
      ...(note ? { note: String(note) } : {}),
    })),
  },
  {
    id: 'robot-arm',
    name: 'Robot Arm',
    parts: [
      ...[
        ['smart-motor', 'Smart Motor', 2],
        ['2x16-beam', '2x16 Beam', 2],
        ['offset-corner-connector', '2x Wide 2x1 Offset Corner Connector', 1],
        ['large-chassis-corner-connector', 'Large Chassis Corner Connector', 2],
        ['corner-connector', '2x Wide 2x2 Corner Connector', 4],
        ['double-offset-corner-connector', 'Double 2x Wide 2x2 Double Offset Corner Connector', 2],
        ['1x2-corner-connector', '2x Wide 1x2 Corner Connector', 2],
        ['double-1x2-corner-connector', 'Double 2x Wide 1x2 Corner Connector', 1],
        ['4x4-plate', '4x4 Plate', 2],
        ['1x16-beam', '1x16 Beam', 4],
      ].map(([id, name, expectedQuantity]) => ({
        id: String(id),
        name: String(name),
        expectedQuantity: Number(expectedQuantity),
        returnedQuantity: null,
      })),
      {
        id: '1x4-beam',
        name: '1x4 Beam',
        expectedQuantity: null,
        returnedQuantity: null,
        expectedQuantityEditable: true,
      },
    ],
  },
  { id: 'robot-claw', name: 'Robot Claw', parts: [] },
  {
    id: 'sensors',
    name: 'Sensors',
    parts: [
      ['touch-led', 'Touch LED', 1],
      ['optical-sensor', 'Optical Sensor', 1],
      ['bumper-switch', 'Bumper Switch', 1],
      ['distance-sensor', 'Distance Sensor', 1],
      ['200mm-smart-cable', '200mm Smart Cable', 1],
      ['300mm-smart-cable', '300mm Smart Cable', 3],
    ].map(([id, name, expectedQuantity]) => ({
      id: String(id),
      name: String(name),
      expectedQuantity: Number(expectedQuantity),
      returnedQuantity: null,
    })),
  },
  {
    id: 'miscellaneous-extra',
    name: 'Miscellaneous / Extra',
    parts: [
      ['pin-tool', 'Pin Tool', 1],
      ['balloon-wheels', '5x Pitch Diameter Balloon Wheels', 2],
      ['400mm-smart-cable', '400mm Smart Cable', 1],
    ].map(([id, name, expectedQuantity]) => ({
      id: String(id),
      name: String(name),
      expectedQuantity: Number(expectedQuantity),
      returnedQuantity: null,
    })),
  },
]

export function createEventBoxChecklist(): EventBoxCategory[] {
  return structuredClone(standardBoxChecklist)
}

export function normalizeEventBoxChecklist(checklist?: EventBoxCategory[]) {
  const savedCategories = new Map((checklist ?? []).map((category) => [category.id, category]))
  return createEventBoxChecklist().map((category) => {
    const savedCategory = savedCategories.get(category.id)
    const savedParts = new Map((savedCategory?.parts ?? []).map((part) => [part.id, part]))
    return {
      ...category,
      parts: category.parts.map((part) => {
        const savedPart = savedParts.get(part.id)
        if (!savedPart) return part
        return {
          ...part,
          expectedQuantity: part.expectedQuantityEditable
            ? savedPart.expectedQuantity
            : part.expectedQuantity,
          returnedQuantity: savedPart.returnedQuantity,
        }
      }),
    }
  })
}
