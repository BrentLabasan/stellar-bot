const orm = require('orm')
const Big = require('big.js')


module.exports = (db) => {

  /**
   * A stellar network transaction
   */
  const Transaction = db.define('transaction', {
      source: String,
      target: String,
      cursor: String,
      memoId: String,
      type: ['deposit', 'withdrawal'],
      createdAt: String,
      amount: String,
      asset: String,
      hash: String,
      credited: Boolean
    }, {
    validations : {
      source : orm.enforce.required('source is required'),
      target : orm.enforce.required('target is required'),
      type : orm.enforce.required('type is required'),
      amount : orm.enforce.required('amount is required'),
      createdAt: orm.enforce.required('createdAt is required'),
      hash: [orm.enforce.unique('Hash already exists.'), orm.enforce.required()]
    },
    hooks: {
      beforeSave: function () {
        if (!this.credited) {
          this.credited = false
        }
      },
      afterSave: async function (success) {
        if (success && !this.credited && this.type === 'deposit') {
          const Account = db.models.account

          if (this.memoId) {
            const memo = this.memoId.toLowerCase()

            let acc = await Account.findByMemoId(memo)

            if (!acc) {
              // we need to ensure that the account exists ...
              const split = memo.split('/')
              if (split.length === 2) {
                acc = await Account.getOrCreate(split[0], split[1])
              }
            }

            if (acc) {
              try {
                await acc.deposit(this)
              } catch (exc) {
                if (exc !== 'DUPLICATE_DEPOSIT') {
                  throw exc
                }
              }
            }
          }
        }
      }
    },
  })

  Transaction.latest = function () {
    return new Promise((resolve, reject) => {
      this.find({type: 'deposit'}).order('-createdAt').run((err, results) => {
        if (err) {
          reject(err)
        }
        resolve(results[0])
      })
    })
  }

  return Transaction
}