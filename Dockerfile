FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist
COPY --from=build /app/dist-client /app/dist-client
COPY --from=build /app/src /app/src
COPY --from=build /app/data /app/data
EXPOSE 8080
CMD ["node", "dist/server.js"]
