export const GET_ACCOUNT_METHOD_QUERY = `
query getAccCreationMethod($startTime: bigint!, $endTime: bigint!, $txIdList: [String!]!) {
    transaction(
      where: {payer_account_id: {_eq: "2"}, result: {_eq: "22"}, consensus_timestamp: {_gte: $startTime, _lte: $endTime}, type: {_eq: "14"}, nonce: {_eq: 0}, id: {_in: $txIdList}}
      order_by: {consensus_timestamp: asc}
    ) {
      consensus_timestamp_iso8601
      consensus_timestamp
      crypto_transfer_aggregate {
        aggregate {
          max {
            amount
          }
        }
      }
    }
  }`;

// // SAMPLE OUTPUT
// {
//     "data": {
//       "transaction": [
//         {
//           "consensus_timestamp_iso8601": "2025-05-02T00:21:49Z",
//           "consensus_timestamp": "1746145309564490760",
//           "crypto_transfer_aggregate": {
//             "aggregate": {
//               "max": {
//                 "amount": 10000000000
//               }
//             }
//           }
//         }
//       ]
//     }
//   }
