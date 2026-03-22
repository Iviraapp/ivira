import db from '../config/database.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'

export async function getOrCreateWallet(memberId, gymId) {
  let wallet = await db('member_wallets').where({ member_id: memberId, gym_id: gymId }).first()
  if (!wallet) {
    ;[wallet] = await db('member_wallets').insert({ member_id: memberId, gym_id: gymId }).returning('*')
  }
  return wallet
}

export async function getWallet(memberId, gymId) {
  const wallet = await getOrCreateWallet(memberId, gymId)
  const transactions = await db('wallet_transactions')
    .where({ wallet_id: wallet.id })
    .orderBy('created_at', 'desc')
    .limit(20)
  return { ...wallet, transactions }
}

export async function purchaseCredits(memberId, gymId, packId) {
  const pack = await db('credit_packs').where({ id: packId, is_active: true }).first()
  if (!pack) throw new NotFoundError('Credit pack')

  const wallet = await getOrCreateWallet(memberId, gymId)

  await db.transaction(async trx => {
    await trx('member_wallets').where({ id: wallet.id }).update({
      balance_paise: db.raw('balance_paise + ?', [pack.credit_paise]),
      total_credited_paise: db.raw('total_credited_paise + ?', [pack.credit_paise]),
      updated_at: new Date(),
    })

    await trx('wallet_transactions').insert({
      wallet_id: wallet.id,
      gym_id: gymId,
      type: 'credit_purchase',
      amount_paise: pack.credit_paise,
      bonus_paise: pack.bonus_paise,
      description: `Purchased ${pack.name}`,
    })
  })

  return getWallet(memberId, gymId)
}

export async function spendCredits(memberId, gymId, amountPaise, { description, referenceId, referenceType }) {
  const wallet = await getOrCreateWallet(memberId, gymId)

  if (wallet.balance_paise < amountPaise) {
    throw new ValidationError('Insufficient wallet balance')
  }

  await db.transaction(async trx => {
    await trx('member_wallets').where({ id: wallet.id }).update({
      balance_paise: db.raw('balance_paise - ?', [amountPaise]),
      total_spent_paise: db.raw('total_spent_paise + ?', [amountPaise]),
      updated_at: new Date(),
    })

    await trx('wallet_transactions').insert({
      wallet_id: wallet.id,
      gym_id: gymId,
      type: 'purchase',
      amount_paise: -amountPaise,
      description,
      reference_id: referenceId,
      reference_type: referenceType,
    })
  })

  return getWallet(memberId, gymId)
}

export async function getCreditPacks(gymId) {
  return db('credit_packs')
    .where(function() {
      this.where({ gym_id: gymId }).orWhereNull('gym_id')
    })
    .andWhere({ is_active: true })
    .orderBy('sort_order')
}

export async function createCreditPack(gymId, data) {
  const [pack] = await db('credit_packs')
    .insert({ gym_id: gymId, ...data })
    .returning('*')
  return pack
}
