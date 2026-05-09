FROM node:20-alpine
WORKDIR /repo
COPY . .
ENV VITE_API_URL=http://localhost:3000
ENV VITE_WS_URL=ws://localhost:3000
RUN npm install \
  && npm run build -w @reh/dashboard
EXPOSE 5173
CMD ["npm", "run", "preview", "-w", "@reh/dashboard", "--", "--host", "0.0.0.0", "--port", "5173"]
