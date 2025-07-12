# Big Data Indexing

## Project Description

### A set of APIs designed for managing health plan data, capable of handling structured JSON data with support for CRUD operations, JSON schema validation, and advanced semantics like conditional reads and writes. These APIs provide merge support for flexible data updates and cascading deletes to maintain data integrity. Data is stored in a key-value store, with RabbitMQ for queuing, and Elasticsearch for efficient search and indexing. Security is enforced through Google Auth 2.0.

## Tech Stack

Code Editor: Visual Studio Code (VS Code)

Version Control: Git

Technology: Node.js, Express.js

Queue: RabbitMQ

Search: Elasticsearch

Authentication: Google Auth 2.0

Storage: Redis (Key-Value Store)


### Installation and Setting up environment

1. Clone this repository:

```bash
git clone git@github.com:NMalpani17/AdvBigDataIndexing.git
```

2. Open the repository with Visual Studio or any other IDE.

3. Run the following command inside project directory to install and add node modules 

```bash
npm install
```
4. Locate the .env.example file in the root directory of the project. Copy this file and rename the copy to .env to create your environment configuration file.
5. The file `.env` is already ignored, so you never commit your credentials.
6. Change the values of the file to your environment. Helpful comments added to `.env.example` file to understand the constants.


## How to run

### Running API server locally

    npm run dev

You will know server is running by checking the output of the command `npm run start`

    [2024-09-06 12:04:08 PM] info:  Server listening on port 8080

**Note:** `8080` will be your `PORT_NUMBER` from .env

### Running API on production

Build the application using the following command.
This would generate a folder called dist in the current directory

    npm run build

To serve the node application, use the following command

    npm start

**Note:** Make sure the `.env` file in the dist folder is setup with required properties else the default properties are loaded

To serve the node application using pm2, use the following command

    npm run start:pm2

**Note:** Requires pm2 to be globally installed

    npm i -g pm2

### Running with Docker
To run the application using Docker Compose, use the following command:

```
docker compose up
```
This command will start all the services defined in your docker-compose.yml file.

### Docker Compose URLs

| Service            | Port  | UI  | Default URL              |
| ------------------ | ----- | --- | ------------------------ |
| Web Server         | 8080  | Yes | <http://localhost:8080>  |
| RabbitMQ Dashboard | 15672 | Yes | <http://localhost:15672> |
| Kibana             | 5601  | Yes | <http://localhost:5601>  |
| GraphQL            | 4000  | Yes | <http://localhost:4000>  |
| Redis Dashboard    | 8081  | Yes | <http://localhost:8081>  | 

## Tests

### Running Test Cases

    npm test

## Lint

### Running Eslint

    npm run lint

To automatically fix lint errors, use the following command

    npm run lint:fix
