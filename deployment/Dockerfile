# syntax=docker/dockerfile:1.6

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY dist/ ./
COPY deployment/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
