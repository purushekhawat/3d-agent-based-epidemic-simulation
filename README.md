# 3D Agent-Based Epidemic Simulation

An interactive, real-time 3D simulation built with Three.js that models the spread of a pandemic across a procedurally generated city. This project features autonomous agents, procedural city generation, A* pathfinding, and dynamic policy toggles for large-scale scenario analysis.

## Features

- **500+ Autonomous Agents:** Watch hundreds of individual "blobs" navigate the city in real-time.
- **A* Pathfinding Algorithm:** Agents calculate the most efficient route across the city grid to their daily destinations.
- **Infection Spread Models:** Mathematical probability-based disease transmission upon physical contact between agents.
- **Dynamic Policy Controls:** Simulate real-world interventions on the fly:
  - **Mask Mandates:** Halves the transmission chance.
  - **Social Distancing:** Reduces the number of physical contacts.
  - **Lockdown:** Instantly freezes 70% of the population, stopping unnecessary movement.

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run start
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Controls

Use the dat.GUI panel in the top right to configure the simulation:
- **Policy Controls:** Toggle Mask Mandates, Social Distancing, and Lockdowns in real-time.
- **Population:** Adjust the number of agents and their movement speed (requires reload).
- **Disease Spread:** Configure initial infected count, base infection chance, and contacts.
- **Show Paths:** Visualize the A* generated paths for all agents.

## Tech Stack
- **Three.js** (WebGL 3D Rendering)
- **Webpack** (Module Bundling)
- **dat.gui** (User Interface)

## License
[MIT](https://choosealicense.com/licenses/mit/)
