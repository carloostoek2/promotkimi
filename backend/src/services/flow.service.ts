import prisma from '../config/database';
import { CreateFlowInput, UpdateFlowInput, AddNodeInput } from '../types';

export async function createFlow(data: CreateFlowInput) {
  return prisma.flow.create({
    data: {
      name: data.name,
      description: data.description,
    },
    include: {
      _count: { select: { nodes: true } },
    },
  });
}

export async function getFlows(promptId?: string) {
  const where = promptId
    ? { nodes: { some: { promptId } } }
    : {};

  return prisma.flow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { nodes: true } },
    },
  });
}

export async function getFlowById(id: string) {
  return prisma.flow.findUnique({
    where: { id },
    include: {
      nodes: {
        orderBy: { position: 'asc' },
        include: {
          prompt: {
            include: {
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  });
}

export async function updateFlow(id: string, data: UpdateFlowInput) {
  return prisma.flow.update({
    where: { id },
    data,
    include: {
      _count: { select: { nodes: true } },
    },
  });
}

export async function deleteFlow(id: string) {
  return prisma.flow.delete({ where: { id } });
}

export async function addNodeToFlow(flowId: string, data: AddNodeInput) {
  const { promptId, position } = data;

  const maxNode = await prisma.flowNode.aggregate({
    where: { flowId },
    _max: { position: true },
  });

  const nextPosition = position ?? ((maxNode._max.position ?? 0) + 1);

  // If inserting at a specific position, shift existing nodes
  if (position !== undefined) {
    const nodesToShift = await prisma.flowNode.findMany({
      where: { flowId, position: { gte: position } },
      orderBy: { position: 'desc' },
    });

    await prisma.$transaction(
      nodesToShift.map(node =>
        prisma.flowNode.update({
          where: { id: node.id },
          data: { position: node.position + 1 },
        })
      )
    );
  }

  return prisma.flowNode.create({
    data: {
      flowId,
      promptId,
      position: nextPosition,
    },
    include: {
      prompt: {
        include: {
          tags: { include: { tag: true } },
        },
      },
    },
  });
}

export async function removeNodeFromFlow(flowId: string, nodeId: string) {
  const node = await prisma.flowNode.findUnique({ where: { id: nodeId } });
  if (!node) throw new Error('Node not found');

  await prisma.flowNode.delete({ where: { id: nodeId } });

  // Renumber remaining nodes
  const remaining = await prisma.flowNode.findMany({
    where: { flowId },
    orderBy: { position: 'asc' },
  });

  await prisma.$transaction(
    remaining.map((n, i) =>
      prisma.flowNode.update({
        where: { id: n.id },
        data: { position: i + 1 },
      })
    )
  );
}

export async function reorderNodes(flowId: string, nodeIds: string[]) {
  await prisma.$transaction(
    nodeIds.map((nodeId, index) =>
      prisma.flowNode.update({
        where: { id: nodeId },
        data: { position: index + 1 },
      })
    )
  );

  return getFlowById(flowId);
}
