FROM node:20-alpine
WORKDIR /repo
COPY . .
RUN npm install \
  && npm run build -w @reh/shared \
  && npm run build -w @reh/api
WORKDIR /repo/services/api
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
