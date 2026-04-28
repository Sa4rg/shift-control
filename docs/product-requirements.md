# Product Requirements

## Product Name

Shift Control

## Purpose

Shift Control is an internal mobile-first application for registering paid sales during staff shifts and automatically calculating shift closing totals.

The goal is to reduce manual errors, replace phone notes and monthly paper sheets, and give admins clear weekly summaries by staff member, store, and payment method.

## Problem

Currently, staff members manually write sales in phone notes and later fill a monthly paper sheet with totals by day, shift, and payment method.

This creates risks:
- calculation mistakes
- missing sales
- unclear payment method totals
- difficulty tracking cash differences
- difficulty tracking pending invoices
- manual weekly admin reconciliation

## MVP Goal

The MVP must allow one store to:

- register paid sales
- register multiple sale items
- apply discounts
- support split payments
- mark sales as invoiced or pending invoice
- edit sales while the shift is open
- cancel sales without deleting them
- close a shift with automatic totals
- document shift closing incidents
- allow admin weekly review by staff member

## Users

### Staff

A staff user can:
- log in with username and PIN
- open a shift
- register sales
- edit sales during an open shift
- cancel sales during an open shift
- mark sales as invoiced or pending
- close their shift
- create incidents when something does not match

### Admin

An admin user can:
- log in with stronger credentials
- view stores
- view staff members
- view shift closures
- view weekly totals
- create admin incidents or notes
- review cash, MB/card, and Glovo totals

## Out of Scope for MVP

The MVP will not include:
- inventory management
- product stock
- customer records
- product catalog
- direct integration with the store billing system
- direct integration with Glovo
- direct integration with card terminals
- offline mode
- PDF or Excel export
- multi-store creation UI

## Main Modules

### Authentication

Handles login, roles, and protected access.

### Users

Stores staff and admin users.

### Stores

Represents store information.

### Shifts

Represents staff work sessions.

### Sales

Represents paid sales registered during a shift.

### Closures

Represents shift closing and calculated totals.

### Incidents

Represents differences, errors, notes, or unresolved problems.

### Reports

Represents weekly and monthly summaries for admin review.

## Payment Methods

Supported payment methods:

- CASH
- MB
- GLOVO_ONLINE
- GLOVO_CASH

Cash-affecting methods:
- CASH
- GLOVO_CASH

Non-cash methods:
- MB
- GLOVO_ONLINE

## Invoice Status

Each sale has an invoice status:

- INVOICED
- PENDING

A sale can be updated from PENDING to INVOICED while the shift is open.

## Shift Closing

At closing time, the system calculates:
- total cash
- total MB
- total Glovo online
- total Glovo cash
- total sales
- pending invoice total
- expected cash amount
- whether there is an incident

The store cash register must remain at 103 EUR.

## Weekly Admin Review

The admin can review a week grouped by:
- store
- staff member
- payment method
- shift closure
- incidents

The admin can confirm whether the physical cash amount matches the expected weekly amount.

If it does not match, the weekly review can be completed with an incident.

## Success Criteria

The MVP is successful if:

- staff can register all sales from a shift
- staff can close a shift without manual calculation
- payment totals are accurate
- admin can review weekly totals
- incidents are recorded instead of being hidden
- the process is easier and less error-prone than notes + paper sheet