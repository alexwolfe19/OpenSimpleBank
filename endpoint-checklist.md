
!!! DON'T FORGET !!!
Everything is gonna be owned by an application - even user owned stuff (that just uses a hidden application!)
(Almost) everything is being "done" by the application, even through tokens!!

- [+] POST /account/signup/
- [+] POST /account/login/
- [+] GET /account/is-logged-in/
- [ ] POST /account/                                      For admins to make accounts :D
- [ ] GET /account/:username/
- [ ] DELETE /account/:username/
- [ ] PATCH /account/:username/
- [ ] POST /account/:username/token/
- [ ] GET /account/:username/token/list/
- [ ] GET /account/:username/token/:uuid/
- [ ] PATCH /acccount/:username/token/:uuid/
- [ ] DELETE /account/:username/token/:uuid/
- [ ] GET /account/:username/forget-password/
- [ ] GET /account/list/

- [ ] GET /session/
- [ ] GET /session/list/
- [ ] GET /session/:target/
- [ ] DELETE /session/:target/
    - [ ] /session/all/
    - [ ] /session/all-but-me/

- [+] POST /currency/
- [+] GET /currency/list/
- [ ] GET /currency/:uuid/
- [ ] PATCH /currency/:uuid/
- [ ] DELETE /currency/:uuid/
- [ ] GET /currency/:uuid/wallets/
- [ ] POST /currency/:uuid/payout/
- [ ] GET /currency/:uuid/admin/list/
- [ ] POST /currency/:uuid/admin/
- [ ] DELETE /currency/:uuid/admin/:username/

- [ ] POST /application/
- [ ] GET /application/list/
- [ ] GET /application/:name/
- [ ] DELETE /application/:name/
- [ ] PATCH /application/:name/
- [ ] POST /application/:name/token/
- [ ] GET /application/:name/token/list/
- [ ] GET /application/:name/token/:uuid/
- [ ] DELETE /application/:name/token/:uuid/
- [ ] PATCH /application/:name/token/:uuid/

- [?] POST /oauth2/token/
- [ ] GET /oauth2/device/

- [+] POST /transaction/
- [+] GET /transaction/list/
- [ ] GET /transaction/:uuid/

- [+] POST /wallet/
- [+] GET /wallet/list/
- [ ] GET /wallet/:uuid/
- [ ] DELETE /wallet/:uuid/
- [ ] GET /wallet/:uuid/member/list
- [ ] POST /wallet/:uuid/member                   (Add a new member)
- [ ] GET /wallet/:uuid/member/:username/
- [ ] PATCH /wallet/:uuid/member/:username/
- [ ] DELETE /wallet/:uuid/member/:username/
