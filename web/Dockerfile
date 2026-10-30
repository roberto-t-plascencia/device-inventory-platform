# --- build stage: compile the React/TypeScript app ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage: static files + reverse proxy, no Node in the final image ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
ENV API_UPSTREAM=api:5000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
