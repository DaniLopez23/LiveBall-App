# Checklist EC2 Free Tier

- [ ] Billing alert enabled.
- [ ] Free Tier eligible Ubuntu 24.04 x86_64 instance selected.
- [ ] 30 GiB gp3 root volume, no extra disk.
- [ ] Security group exposes only 80 and SSH 22 from My IP.
- [ ] Repository cloned at `/opt/liveball`.
- [ ] `deploy/setup-ec2-ubuntu.sh` executed and SSH session reopened.
- [ ] `.env.ec2.example` copied to `.env`.
- [ ] Images built sequentially.
- [ ] `docker compose up -d` completed.
- [ ] `/health`, `/ready` and `/api/v1/games` return successfully.
- [ ] `liveball.service` enabled.
- [ ] Public page opens at `http://IP_PUBLICA`.
