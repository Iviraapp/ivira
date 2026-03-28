import db from '../config/database.js';

export default async function recipeRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken] };
  const ownerHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // GET /recipes — list all recipes
  fastify.get('/recipes', authHooks, async (request) => {
    const { category, search, tags, limit: rawLimit, offset: rawOffset } = request.query;
    const safeLimit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const safeOffset = Math.max(parseInt(rawOffset) || 0, 0);

    let query = db('recipes').where('is_active', true);

    if (category) {
      query = query.where('category', category);
    }

    if (search) {
      query = query.where(function () {
        this.whereILike('title', `%${search}%`)
          .orWhereILike('description', `%${search}%`);
      });
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query = query.whereRaw('tags && ?', [tagList]);
    }

    const recipes = await query
      .orderBy('title')
      .limit(safeLimit)
      .offset(safeOffset);

    return { recipes, count: recipes.length };
  });

  // GET /recipes/:recipeId — get single recipe detail
  fastify.get('/recipes/:recipeId', authHooks, async (request, reply) => {
    const { recipeId } = request.params;

    const recipe = await db('recipes')
      .where('id', recipeId)
      .first();

    if (!recipe) {
      return reply.code(404).send({ error: 'Recipe not found' });
    }

    return { recipe };
  });

  // POST /gyms/:gymId/members/:memberId/recipes/favorites — add favorite
  fastify.post('/gyms/:gymId/members/:memberId/recipes/favorites', ownerHooks, async (request, reply) => {
    const { memberId } = request.params;
    const { recipe_id } = request.body || {};

    if (!recipe_id) {
      return reply.code(400).send({ error: 'recipe_id is required' });
    }

    // Check recipe exists
    const recipe = await db('recipes').where('id', recipe_id).first();
    if (!recipe) {
      return reply.code(404).send({ error: 'Recipe not found' });
    }

    // Check if already favorited
    const existing = await db('member_favorite_recipes')
      .where({ member_id: memberId, recipe_id })
      .first();

    if (existing) {
      return reply.code(409).send({ error: 'Recipe already in favorites' });
    }

    const [favorite] = await db('member_favorite_recipes')
      .insert({ member_id: memberId, recipe_id })
      .returning('*');

    return reply.code(201).send({ favorite });
  });

  // GET /gyms/:gymId/members/:memberId/recipes/favorites — list favorites
  fastify.get('/gyms/:gymId/members/:memberId/recipes/favorites', ownerHooks, async (request) => {
    const { memberId } = request.params;

    const favorites = await db('member_favorite_recipes')
      .join('recipes', 'member_favorite_recipes.recipe_id', 'recipes.id')
      .where('member_favorite_recipes.member_id', memberId)
      .select('recipes.*', 'member_favorite_recipes.created_at as favorited_at')
      .orderBy('member_favorite_recipes.created_at', 'desc');

    return { favorites };
  });

  // DELETE /gyms/:gymId/members/:memberId/recipes/favorites/:recipeId — remove favorite
  fastify.delete('/gyms/:gymId/members/:memberId/recipes/favorites/:recipeId', ownerHooks, async (request, reply) => {
    const { memberId, recipeId } = request.params;

    const deleted = await db('member_favorite_recipes')
      .where({ member_id: memberId, recipe_id: recipeId })
      .del();

    if (!deleted) {
      return reply.code(404).send({ error: 'Favorite not found' });
    }

    return { message: 'Favorite removed' };
  });
}
