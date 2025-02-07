export const GET_ACCOUNT_ACTIVITY_QUERY = `
query getAccountActivity($accountIds: [bigint!], $startTime: bigint!, $endTime: bigint!) {
  transaction(
    where: {
      payer_account_id: {_in: $accountIds},
      consensus_timestamp: {_gte: $startTime, _lte: $endTime}
    }
    order_by: {consensus_timestamp: asc}
  ) {
    consensus_timestamp
    id
    type
    result
    payer_account_id
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
