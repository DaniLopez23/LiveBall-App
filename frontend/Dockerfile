FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM deps AS build

ARG VITE_API_URL=http://localhost:8000
ARG VITE_WS_URL=ws://localhost:8000/api/v1
ARG VITE_WS_BASE_URL=ws://localhost:8000/api/v1

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_WS_BASE_URL=${VITE_WS_BASE_URL}

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
