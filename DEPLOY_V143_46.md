# Spreelo v143.46 — customer campaign schedule unlock

Calendar campaigns keep Spreelo's recommended dates and times locked by default, but every planned post now has a discreet **Unlock** action.

After unlocking a post, the customer can choose both a custom date and a custom publishing time before activating the campaign. This works in the premium campaign preview as well as the full plan view, with dedicated responsive layouts for desktop, tablet and mobile.

No database migration is required for this release. Existing campaign generation and activation logic is unchanged; the selected `startDate` and `publishTime` are already persisted by the existing plan save flow.
