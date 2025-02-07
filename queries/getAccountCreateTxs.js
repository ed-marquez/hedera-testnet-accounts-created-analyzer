export const GET_ACCOUNT_CREATE_TXS_QUERY = `
query getAccountCreateTxs($startTime: bigint!, $endTime: bigint!) {
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
    id
    type
    nonce
    entity_id
    parent_transaction {
      nonce
      crypto_transfer {
        amount
      }
    }
  }
}`;

// // SAMPLE OUTPUT
// {
//   "data": {
//     "transaction": [
//       {
//         "consensus_timestamp": "1738934842061836677",
//         "id": "0.0.1523@1738934833.925493071",
//         "type": 8,
//         "nonce": 1,
//         "entity_id": 5483644,
//         "parent_transaction": {
//           "nonce": 0,
//           "crypto_transfer": [
//             {
//               "amount": 10000000000
//             },
//             {
//               "amount": -10000000000
//             }
//           ]
//         }
//       },
//       {
//         "consensus_timestamp": "1738934842061836678",
//         "id": "0.0.1523@1738934833.925493071",
//         "type": 8,
//         "nonce": 2,
//         "entity_id": 5483645,
//         "parent_transaction": {
//           "nonce": 0,
//           "crypto_transfer": [
//             {
//               "amount": 100000000000
//             },
//             {
//               "amount": -100000000000
//             }
//           ]
//         }
//       }
//     ]
//   }
// }
