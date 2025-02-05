query countAccountCreateTxs {
  transaction_aggregate(
    where: {
      payer_account_id: {_eq: "2"}, # Account 0.0.2
      result: {_eq: "22"}, # SUCCESS
      consensus_timestamp: {_gte: "1706812520644859297"}, # After last reset on 2024-02-01
      type: {_eq: "11"}, # CRYPTO CREATE ACCOUNT
      nonce: {_gte: 1}, # Nonce greater than 1
      id: {_neq: "0.0.2@1706812511.019092963"}} # Exclude system setup tx
  ) {
    aggregate {
      count
    }
  }
}

// SAMPLE OUTPUT
// {
//   "data": {
//     "transaction_aggregate": {
//       "aggregate": {
//         "count": 20801
//       }
//     }
//   }
// }