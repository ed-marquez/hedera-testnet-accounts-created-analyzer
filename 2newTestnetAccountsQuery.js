query MyQuery {

  transaction(
    where: {payer_account_id: {_eq: "2"}, result: {_eq: "22"}, consensus_timestamp: {_gte: "1706812520644859297"}, type: {_eq: "11"}, nonce: {_gte: 1}, id: {_neq: "0.0.2@1706812511.019092963"}}
    order_by: {consensus_timestamp: asc}
  ) {
    id
    consensus_timestamp
    type
    nonce
    entity_id
    parent_transaction {
      nonce
      transfer {
        amount
      }
    }
  }
}

// SAMPLE OUTPUT
// {
//   "data": {
//     "transaction": [
//       {
//         "id": "0.0.2@1706812879.799123335",
//         "consensus_timestamp": "1706812890529120002",
//         "type": 11,
//         "nonce": 1,
//         "entity_id": 1002,
//         "parent_transaction": null
//       },
//       {
//         "id": "0.0.2@1706812979.803437910",
//         "consensus_timestamp": "1706812990496232002",
//         "type": 11,
//         "nonce": 1,
//         "entity_id": 1003,
//         "parent_transaction": null
//       },