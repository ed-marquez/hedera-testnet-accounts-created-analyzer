export const GET_TX_HISTORY_QUERY = `
query getAccountActivity($accountIds: [bigint!], $startTime: bigint!, $endTime: bigint!, $limit: Int!, $offset: Int!) {
  transaction(
    where: {
      payer_account_id: {_in: $accountIds},
      consensus_timestamp: {_gte: $startTime, _lte: $endTime},
    }
      
    order_by: {consensus_timestamp: asc}
    limit: $limit
    offset: $offset
  ) {
    consensus_timestamp
    consensus_timestamp_iso8601
    id
    payer_account_id
    type
    result
  }
}`;

// // SAMPLE OUTPUT
// {
//   "data": {
//     "transaction": [
//       {
//         "consensus_timestamp": "1714170443576292670",
//         "id": "0.0.2668966@1714170385.390981410",
//         "type": 29,
//         "result": 22,
//       },
//       {
//         "consensus_timestamp": "1714170443576292671",
//         "id": "0.0.2668966@1714170385.390981410",
//         "type": 29,
//         "result": 22,
//       },
//     ]
//   }
// }
