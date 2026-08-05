FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY server.js app.js index.html styles.css landing.html landing.css landing.js redesign.css robots.txt sitemap.xml README.md ./

RUN addgroup -S ledgerlane && adduser -S ledgerlane -G ledgerlane && mkdir -p /app/data && chown -R ledgerlane:ledgerlane /app

USER ledgerlane
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
