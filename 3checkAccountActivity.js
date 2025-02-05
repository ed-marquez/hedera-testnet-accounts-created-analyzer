query checkAccountActivity {
  transaction_aggregate(where: {payer_account_id: {_eq: "2668966"}, consensus_timestamp: {_gte: "1706812520644859297"}}) {
    aggregate {
      count
    }
  }
  
  transaction(
    where: {payer_account_id: {_eq: "2668966"}, consensus_timestamp: {_gte: "1706812520644859297"}}
    order_by: {consensus_timestamp: asc}
  ) {
    id
    consensus_timestamp
    result
    type
    entity_id 
  }
}

// // SAMPLE OUTPUT
// {
//   "data": {
//     "transaction_aggregate": {
//       "aggregate": {
//         "count": 10
//       }
//     },
//     "transaction": [
//       {
//         "id": "0.0.2668966@1714170385.390981410",
//         "consensus_timestamp": "1714170443576292670",
//         "result": 22,
//         "type": 29,
//         "entity_id": 4285299
//       },
//       {
//         "id": "0.0.2668966@1738186280.747556613",
//         "consensus_timestamp": "1738186288015917471",
//         "result": 22,
//         "type": 11,
//         "entity_id": 5443737
//       },
//       {
//         "id": "0.0.2668966@1738186284.319260686",
//         "consensus_timestamp": "1738186290025668180",
//         "result": 22,
//         "type": 15,
//         "entity_id": 5443737
//       }
//     ]
//   }
// }