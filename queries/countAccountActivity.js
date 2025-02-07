export const COUNT_ACCOUNT_ACTIVITY_QUERY = `
query countAccountActivity {
  transaction_aggregate(
    where: {
      payer_account_id: {_eq: "2668966"}, 
      consensus_timestamp: {_gte: "1706812520644859297"}
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
