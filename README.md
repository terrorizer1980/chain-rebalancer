# Matic Rebalancer

## Local Dev

Go into each directory in `layers` and `functions`, do the following:

- `npm install`
- `npm run build:prod` or `npm run build:dev` to watch files

From `apis/rebalancer` run:

- `sam build`
- `sam local invoke "MaticFunction" -e functions/rebalance/src/__tests__/events/deposit-approve.json` for example
  or
- `sam local start-api`
