FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fwo/web build && pnpm --filter @fwo/admin build

FROM nginx:1.29-alpine
COPY infrastructure/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY infrastructure/nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html/web
COPY --from=build /workspace/apps/admin/dist /usr/share/nginx/html/admin
EXPOSE 8080 8081
