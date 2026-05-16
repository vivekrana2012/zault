# Tradebook CSV Domain Knowledge

This document is the shared source of truth for tradebook CSV semantics used by both humans and coding agents.

## Overview

The tradebook CSV contains executed trade records. Each row is one executed trade.

## Canonical Header

symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time

## Example Row

ICICIBANK,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92.000000,1084.750000,20015219,1100000000191603,2024-04-04T09:07:37

## Column Dictionary

| name | type | example | required | meaning | notes |
|---|---|---|---|---|---|
| symbol | string | ICICIBANK | yes | Exchange trading symbol of the security | Human-readable identifier; can change over time in some markets. |
| isin | string | INE090A01021 | yes | International Securities Identification Number | Unique security identity key. Prefer this for security-level aggregation. |
| trade_date | date (YYYY-MM-DD) | 2024-04-04 | yes | Calendar date of trade execution | Use local market date. |
| exchange | string | NSE | yes | Exchange where execution happened | Example values: NSE, BSE. |
| segment | string | EQ | yes | Broad market/asset segment | Defines broad category such as Equity, Derivatives, Currency, Commodities. |
| series | string | EQ | yes | Exchange-specific sub-classification/settlement series | Interpreted within the context of exchange and segment. |
| trade_type | enum string | buy | yes | Direction of trade | Common values: buy, sell. |
| auction | boolean | false | yes | Whether trade was part of auction mechanism | True/false flag. |
| quantity | decimal | 92.000000 | yes | Number of units traded | Positive quantity expected. |
| price | decimal | 1084.750000 | yes | Per-unit execution price | Positive price expected. |
| trade_id | string or integer-like | 20015219 | yes | Unique execution record ID from broker | One order can produce multiple trade IDs (partial fills). |
| order_id | string or integer-like | 1100000000191603 | yes | Parent order ID placed by user | Can map to multiple trades. |
| order_execution_time | datetime (ISO 8601) | 2024-04-04T09:07:37 | yes | Execution timestamp for the trade fill | Should be interpreted in broker/exchange timezone context if available. |

## Domain Rules

- ISIN is the identity of a security and should be used as the primary aggregation key for security-level analytics.
- A single order_id can have multiple trade_id entries because brokers can execute one order in multiple partial fills.
- Segment represents the broad market category and drives margin, settlement cycle, and risk context.
- Series is a narrower exchange-level classification within a segment and defines settlement/trading conditions for that listing.

## Known Non-Equivalences

- EQ on NSE is a settlement series code.
- Group A on BSE is a stock classification bucket.
- They are not equivalent concepts and should not be mapped as synonyms.

## Normalization Rules

- Treat trade_type as case-insensitive during ingestion and normalize to lowercase buy/sell internally.
- Treat auction as a boolean field and normalize accepted textual variants to true/false.
- Parse quantity and price as decimals; preserve precision from source when possible.
- Parse order_execution_time as an ISO-like datetime string.

## Usage in Zault

- Allocation donut and other security-level rollups should aggregate by isin.
- Storage and import should preserve trade-level granularity by trade_id.
- Order-level analysis can roll up using order_id where needed.

## Out of Scope

- Parser implementation details.
- API endpoint definitions.
- UI rendering implementation.
