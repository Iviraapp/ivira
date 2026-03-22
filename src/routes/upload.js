import config from '../config/index.js';

export default async function uploadRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Image upload → Vercel Blob (or local fallback in dev)
  fastify.post('/upload', authHooks, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'No file uploaded' });

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Only JPEG, PNG, GIF, WebP images are allowed' });
    }

    const chunks = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 5MB max
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.code(400).send({ error: 'File too large (max 5MB)' });
    }

    if (config.blob.enabled) {
      const { put } = await import('@vercel/blob');
      const ext = data.mimetype.split('/')[1] || 'jpg';
      const filename = `newsletter/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const blob = await put(filename, buffer, {
        access: 'public',
        token: config.blob.token,
        contentType: data.mimetype,
      });
      return { url: blob.url };
    }

    // Dev fallback: base64 data URL
    const base64 = buffer.toString('base64');
    return { url: `data:${data.mimetype};base64,${base64}` };
  });
}
