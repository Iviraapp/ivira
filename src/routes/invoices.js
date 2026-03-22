import * as invoiceService from '../services/invoice.service.js';

const createInvoiceSchema = {
  body: {
    type: 'object',
    required: ['lineItems', 'buyerName'],
    properties: {
      memberId: { type: 'string', format: 'uuid' },
      paymentId: { type: 'string', format: 'uuid' },
      buyerName: { type: 'string', minLength: 2, maxLength: 200 },
      buyerGstin: { type: 'string', maxLength: 15 },
      buyerAddress: { type: 'string', maxLength: 500 },
      lineItems: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['description', 'amountPaise'],
          properties: {
            description: { type: 'string', minLength: 1, maxLength: 300 },
            amountPaise: { type: 'integer', minimum: 1 },
            quantity: { type: 'integer', minimum: 1 },
            hsnCode: { type: 'string', maxLength: 10 },
          },
        },
      },
    },
  },
};

const updateStatusSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['issued', 'paid', 'cancelled', 'void'] },
    },
  },
};

export default async function invoiceRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Create invoice
  fastify.post('/gyms/:gymId/invoices', { schema: createInvoiceSchema, ...authHooks }, async (request, reply) => {
    const invoice = await invoiceService.createInvoice(request.params.gymId, request.body);
    return reply.code(201).send({ invoice });
  });

  // List invoices
  fastify.get('/gyms/:gymId/invoices', authHooks, async (request) => {
    const { page, limit, month, year, status } = request.query;
    return invoiceService.listInvoices(request.params.gymId, { page, limit, month, year, status });
  });

  // Invoice stats
  fastify.get('/gyms/:gymId/invoices/stats', authHooks, async (request) => {
    const { month, year } = request.query;
    return invoiceService.getInvoiceStats(request.params.gymId, month, year);
  });

  // Get single invoice
  fastify.get('/gyms/:gymId/invoices/:invoiceId', authHooks, async (request) => {
    const invoice = await invoiceService.getInvoice(request.params.gymId, request.params.invoiceId);
    return { invoice };
  });

  // Update invoice status
  fastify.patch('/gyms/:gymId/invoices/:invoiceId/status', { schema: updateStatusSchema, ...authHooks }, async (request) => {
    const invoice = await invoiceService.updateInvoiceStatus(
      request.params.gymId,
      request.params.invoiceId,
      request.body.status,
    );
    return { invoice };
  });

  // Download invoice as PDF
  fastify.get('/gyms/:gymId/invoices/:invoiceId/pdf', authHooks, async (request, reply) => {
    const buffer = await invoiceService.generateInvoicePDF(
      request.params.gymId,
      request.params.invoiceId,
    );
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="invoice-${request.params.invoiceId}.pdf"`);
    return reply.send(buffer);
  });
}
