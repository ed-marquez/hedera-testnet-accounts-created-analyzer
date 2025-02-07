export const COUNT_ACCOUNT_CREATE_TXS_QUERY = `
query countAccountCreateTxs {
  transaction_aggregate(
    where: {
      payer_account_id: {_eq: "2"},
      result: {_eq: "22"},
      consensus_timestamp: {_gte: "1706812520644859297"},
      type: {_eq: "11"},
      nonce: {_gte: 1},
      id: {_neq: "0.0.2@1706812511.019092963"}
    }
  ) {
    aggregate {
      count
    }
  }
}`;

// // SAMPLE OUTPUT
// {
//   "data": {
//     "transaction_aggregate": {
//       "aggregate": {
//         "count": 10
//       }
//   }
// }
// }
