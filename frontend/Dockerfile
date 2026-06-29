FROM node:22-alpine AS deps

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=liveball-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build

ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_WS_BASE_URL

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
