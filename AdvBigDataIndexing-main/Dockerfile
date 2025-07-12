FROM node:21-alpine3.18 AS base_build

WORKDIR /usr/src/build
COPY . .

FROM base_build AS build
RUN npm install
RUN npm run build
RUN mkdir -p /usr/src/app
RUN cp -r /usr/src/build/dist /usr/src/app
RUN rm -rf /usr/src/build

FROM build AS webapp
WORKDIR /usr/src/app/dist
ENV NODE_ENV=production
ENV PORT=8080
CMD ["npm", "start"]
EXPOSE 8080
EXPOSE 8081
EXPOSE 4000

FROM build AS consumer
WORKDIR /usr/src/app/dist
ENV NODE_ENV=production
CMD ["npm", "run", "start:consumer"]
