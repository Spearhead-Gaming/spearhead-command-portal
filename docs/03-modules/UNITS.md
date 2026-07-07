# Units Module

## Purpose

Manage Spearhead Gaming's unit structure.

## Initial Units

- Spearhead Command
- 3rd Infantry Division (Reaper)
- 75th Ranger Regiment (Misfit)
- 1st Air Cavalry Brigade (Gambler)
- Detachment-7 (Viking)

## Core Features

- Unit pages
- Unit roster
- Leadership display
- Positions
- Billets
- Open slots
- Unit readiness
- Discord channel mapping

## Design Requirement

Units must be configurable. Do not hard-code the initial five units into the application logic.

Until dedicated billet management is implemented, roster assignment flows may create a missing
position record for the selected unit so personnel actions can remain functional without
hard-coded billet seeds.
