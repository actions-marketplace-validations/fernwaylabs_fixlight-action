# Fixlight Accessibility Scan

A GitHub Action that checks a public web page for accessibility problems on every push or deploy, and writes what it
found to the job summary: each problem, how serious it is, how to fix it, and whether the free
[Fixlight WordPress plugin](https://wordpress.org/plugins/fixlight/) fixes it on its own.

We make Fixlight (Fernway Labs). The Action works on any public page, WordPress or not.

## Usage

```yaml
name: Accessibility
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: fernwaylabs/fixlight-action@v1
        with:
          url: https://preview.example.com/
          api_key: ${{ secrets.FIXLIGHT_SCAN_KEY }}
```

To fail the job when serious problems appear:

```yaml
      - uses: fernwaylabs/fixlight-action@v1
        with:
          url: |
            https://preview.example.com/
            https://preview.example.com/contact/
          api_key: ${{ secrets.FIXLIGHT_SCAN_KEY }}
          fail_on_serious: 'true'
          max_serious: '0'
```

## Get a key

Keys are free: enter your email at [fixlight.fernwaylabs.com/api-key/](https://fixlight.fernwaylabs.com/api-key/), confirm
it, and copy the key. Save it as a repository secret named `FIXLIGHT_SCAN_KEY`. Each key can run 20 scans an hour and
200 a day.

## Inputs

| Input | Required | Default | What it does |
|---|---|---|---|
| `url` | yes | | The public page to scan, such as a deploy preview or the live site. For several pages, put one per line. |
| `api_key` | yes | | Your Fixlight scan API key. Keep it in a repository secret. |
| `fail_on_serious` | no | `false` | Fail the job when there are more serious or critical problems than `max_serious`. |
| `max_serious` | no | `0` | How many serious or critical problems are allowed before the job fails. |

The job also fails when the key is rejected. A page that doesn't load, or a rate limit, gives a warning instead.

## Outputs

| Output | What it holds |
|---|---|
| `problems` | Problems found, added up over all the pages |
| `serious` | Serious or critical problems, added up over all the pages |
| `fixed_by_free_plugin` | Problems the free Fixlight plugin fixes on its own, added up over all the pages |

## What it checks

- Each URL is one page, loaded in a real browser the way a visitor sees it. Links are not followed.
- Automated checks find many accessibility problems, but not all of them, and some fixes need a person. The results
  are not a statement about any law.
- Private, local and bare-IP addresses are refused, so the page must be reachable from the internet.
- The same page scanned again within 24 hours gets the earlier answer. It still counts toward the key's limits.

## Privacy

The Action sends the URLs you give it, and your key, to `fixlight.fernwaylabs.com`. The scanned pages are kept for a day,
and requests are counted per key and day to keep within the limits. Your email is used only to send you the key and to
tell you about changes to the scan API. Details: [privacy page](https://fixlight.fernwaylabs.com/privacy/#keys).

## License

[MIT](LICENSE)
