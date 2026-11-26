# Features

The capabilities below have been identified in the existing SCRAPT application. This repository documents them; it does not distribute their implementation.

## Market workspace

The dashboard presents market prices, recent price history, trade activity and volume. A multi-asset watchlist helps users compare changes across monitored assets. Time-range controls, pause/resume and sound controls support different monitoring workflows.

## Derivatives and liquidity

Funding rates, Open Interest and trader-positioning indicators provide derivatives context. Aggregate order-book information shows the balance of buy and sell liquidity. These indicators describe observed conditions; they are not forecasts or trading instructions.

## Sentiment and market context

Sentiment indicators and public information appear alongside market measurements. The application also supports AI-assisted interpretation of public news and contextual explanations.

## Alerts

Users can review recent detected events, filter them by urgency and inspect explanatory information. Monitoring status provides context for interpreting those alerts. Optional notifications support awareness while the application is running.

An alert is an observation of configured conditions, not a recommendation to buy or sell. This public documentation intentionally omits evaluation formulas and backend implementation details.

## Scrappy

Scrappy is the original assistant within the dashboard. Users can ask questions about available market context and terminology. Its conversation interface and existing integration remain part of the product.

An AI service must be available for generated responses. Explanations can be incomplete or incorrect and should be checked against the underlying data. Scrappy should acknowledge missing information rather than invent market values.

## Availability states

Market and sentiment data depend on external services. The interface distinguishes unavailable information from valid numeric values. A connected dashboard alone does not establish that every upstream data source is healthy.

## Product boundaries

SCRAPT does not execute trades. This repository makes no claims of guaranteed accuracy, profitability, predictive performance or uninterrupted service.
