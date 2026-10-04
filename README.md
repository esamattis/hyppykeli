
# [hyppykeli.fi](https://hyppykeli.fi)

Vanha hyppykeli.fi mätäni. Tässä on uusi (2024) joka ehkä toimii paremmin.

Säädata haetaan suoraan CORssilla Ilmatieteen laitoksen APIsta ilman varsinaista backendiä. Muutoksia voi tehdä `src` hakemiston tiedostoihin, jotka näkyvät välittömästi. Vain riippuvuudet ovat bundlattuja, jotka nekin ovat commitoituna gittiin, eli kehittäminen ei vaadi kuin tekstieditorin ja staattisia tiedostoja jakavan http-serverin, esim. ajamalla `python -m http.server` tän repon juuressa, mutta muutkin vastaavat toimii.

Deploy tapahtuu kun tämän repon `main` branchiin tehdään push. PR:t tervetulleita


Tää on [Preactilla](https://preactjs.com/) toteutettu Single-Page Appi. Apuna käytetään [htm](https://github.com/developit/htm)-kirjastoa, jotta ei tarvita
bundleria käätämään JSX:ää. Graaffeja piirretään [Chart.js v4](https://www.chartjs.org/):lla. Ei oteta enempää kirjastoja mukaan ylläpito taakan välttämiseksi.

Playwright-testit: asenna riippuvuudet komennolla `mise exec -- pnpm install` ja
Chromium komennolla `mise exec -- pnpm exec playwright install chromium`.
Aja testit headless-tilassa komennolla `pn test` (tai `mise exec -- pnpm test`). Testit käynnistävät oman
HTTP-palvelimen porttiin 8489 ja testaavat työpöytä- ja mobiilinäkymät suoraan
kehittäjätilan URL-parametreilla. Ulkoiset pyynnöt estetään; tuuliarvoista
tarkistetaan vain kehittäjätilassa asetetut havainnot ja kartan keskiarvo.
