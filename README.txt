EnviroMulch multi-page site (Plesk / IIS)
=========================================

Upload everything in this folder to the site's web root (httpdocs).

TEST NOINDEX MARKER - REMOVE AT LAUNCH
Every HTML page has this single line in its <head>:
  <!-- NOINDEX-TEST-SUBDOMAIN: remove this line at launch --><meta name="robots" content="noindex, nofollow"><!-- /NOINDEX-TEST-SUBDOMAIN -->
It stops search engines indexing the test copy. When the site goes live on
https://enviromulchonline.com/, delete that whole line from every .html/.htm file
(a find-and-replace on the line works). The old-URL redirect pages carry it too.

ORDER FORM
/order/ posts to /order.ashx, which emails the order via Resend.
web.config holds RESEND_API_KEY with an EMPTY value. Paste the key on the server only
(Plesk File Manager). Never put the key in any file you upload or share.

OLD URLS
These small HTML files sit at the old site's addresses and forward visitors
(meta refresh + canonical) to the new pages, so old links and bookmarks still work:
  Mulch2.htm, Agregates.htm, RedRock.htm, soils/Soils.htm, Playground.htm,
  WearMats3.htm, "Baled Products/Baled.htm", coverage.htm,
  enviro_mulch_overview.htm, "order form1.htm", default.htm

FILES TO KEEP FROM THE OLD SITE
/ContractorApp.pdf is linked from Overview, Contact and the footer. It is not in
this package: keep (or re-upload) the existing ContractorApp.pdf in the web root.

PHOTOS
Product photos show "Photo coming soon" placeholders. Add photos to /images/ and
replace the placeholders.

sitemap.xml and robots.txt point at https://enviromulchonline.com/.
