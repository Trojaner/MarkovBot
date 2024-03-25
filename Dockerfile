FROM node:lts-alpine as base
ENV NODE_ENV=development

WORKDIR /app
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/app/.yarn/cache yarn install --immutable

FROM base as build
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN yarn build

FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=base /app/node_modules/ ./node_modules
COPY --from=base /app/package.json ./
COPY --from=build /app/dist ./dist

CMD ["yarn", "start"]