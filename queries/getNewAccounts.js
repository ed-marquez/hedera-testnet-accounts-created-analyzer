export const GET_ACCOUNTS_QUERY = `
query getNewAccounts($startTime: bigint!, $endTime: bigint!) {
  transaction(
    where: {
      payer_account_id: {_eq: "2"},
      result: {_eq: "22"},
      consensus_timestamp: {_gte: $startTime, _lte: $endTime},
      type: {_eq: "11"},
      nonce: {_gte: 1},
      id: {_neq: "0.0.2@1706812511.019092963"}
    }
    order_by: {consensus_timestamp: asc}
  ) {
    consensus_timestamp
    consensus_timestamp_iso8601
    id
    entity_id
  }
}`;

// // SAMPLE OUTPUT
// {
//   "data": {
//     "transaction": [
//       {
//         "consensus_timestamp": "1706812890529120002",
//         "id": "0.0.2@1706812879.799123335",
//         "type": 11,
//         "nonce": 1,
//         "entity_id": 1002,
//         "parent_transaction": null
//       },
//       {
//         "consensus_timestamp": "1706812990496232002",
//         "id": "0.0.2@1706812979.803437910",
//         "type": 11,
//         "nonce": 1,
//         "entity_id": 1003,
//         "parent_transaction": null
//       },
//       {
//         "consensus_timestamp": "1706813969309574349",
//         "id": "0.0.2@1706813956.461991758",
//         "type": 11,
//         "nonce": 1,
//         "entity_id": 1004,
//         "parent_transaction": null
//       }
//     ]
//   }
// }
