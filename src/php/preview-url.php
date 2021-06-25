<?php

class InvalidUrlException extends Exception {}
class RequestFailedException extends Exception {}
class HTMLParsingException extends Exception {}


if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'])) {
  http_response_code(405);
  header('Cache-Control: no-cache');
  header('Content-Type: application/json');
  echo json_encode([
    'error' => [
      'message' => 'Method not allowed.'
    ]
  ]);
  die();
}


try {
  if (!array_key_exists('url', $_GET)) {
    throw new InvalidUrlException('URL is not specified.');
  }
  $parsed_url = parse_url($_GET['url']);
  if (!in_array($parsed_url['scheme'], ['http', 'https'])) {
    throw new InvalidUrlException('URL can only have scheme HTTP or HTTPS.');
  }
  if (preg_match('/^(?:localhost|127\..*|192\..*|10\..*|fe80\:.*)$/', $parsed_url['host'])) {
    throw new InvalidUrlException('Local network URLs are not allowed.');
  }

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_NOBODY, true);
  curl_setopt($ch, CURLOPT_URL, $_GET['url']);
  curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
  curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
  curl_exec($ch);

  if (curl_errno($ch)) {
    throw new RequestFailedException(curl_error($ch));
  }

  $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($status_code !== 200) {
    throw new RequestFailedException('Got status code '.$status_code.', expected 200.');
  }
  $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
  $content_length = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
  curl_close($ch);
  if ($content_type) {
    $content_type = strtok($content_type, ';');
  }
  if ($content_length == -1) {
    $content_length = null;
  }

  if ($content_type != 'text/html' || $content_length >= 204800) { # 200KB
    throw new HTMLParsingException('Not an HTML document or body is too large.');
  }

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_URL, $_GET['url']);
  curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
  curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept-Charset' => 'utf-8',
    'Accept' => 'text/html; charset=utf-8',
  ]);
  curl_setopt($ch, CURLOPT_NOPROGRESS, false);
  curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, function($ch, $download_size, $downloaded, $upload_size, $uploaded) {
    if ($downloaded >= 204800) { # 200KB
      return 1;
    } else {
      return 0;
    }
  });
  $body = curl_exec($ch);

  if (curl_errno($ch)) {
    throw new RequestFailedException(curl_error($ch));
  }

  $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($status_code !== 200) {
    throw new RequestFailedException('Got status code '.$status_code.', expected 200.');
  }
  $final_url = parse_url(curl_getinfo($ch, CURLINFO_EFFECTIVE_URL));
  $final_origin = $final_url['host'] . (array_key_exists('port', $final_url) ? ':'.$final_url['port'] : '');
  curl_close($ch);

  $doc = DOMDocument::loadHTML(mb_convert_encoding($body, 'html-entities', 'utf-8'), LIBXML_NOERROR | LIBXML_NOWARNING);
  if ($doc == false) {
    throw new HTMLParsingException('Parse failed.');
  }
  $xpath = new DOMXpath($doc);

  $title_text = $xpath->query("//title//text()")->item(0);
  if (!$title_text) $title_text = $xpath->query("//h1//text()")->item(0);

  if ($title_text) {
    $title_text = $title_text->textContent;
  } else {
    $title_text = null;
  }

  $description_text = $xpath->query("//meta[@name='description']/@content")->item(0);
  if (!$description_text) $description_text = $xpath->query("//meta[@property='og:description']/@content")->item(0);

  if ($description_text) {
    $description_text = $description_text->textContent;
  } else {
    $description_text = null;
  }

  $og_image = $xpath->query("//meta[@property='og:image']/@content")->item(0);

  if ($og_image) {
    $og_image = $og_image->textContent;
  } else {
    $og_image = null;
  }

  header('Cache-Control: max-age=3600');
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'type' => $content_type,
    'length' => $content_length,
    'summary' => [
      'title' => $title_text,
      'description' => $description_text,
      'origin' => $final_origin,
      'image' => $og_image,
    ],
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (HTMLParsingException $e) {
  header('Cache-Control: max-age=3600');
  header('Content-Type: application/json');
  echo json_encode([
    'type' => $content_type,
    'length' => $content_length,
  ]);
  die();

} catch (InvalidUrlException $e) {
  http_response_code(400);
  header('Cache-Control: max-age=300');
  header('Content-Type: application/json');
  echo json_encode([
    'error' => [
      'message' => $e->getMessage()
    ]
  ]);
  die();

} catch (RequestFailedException $e) {
  http_response_code(404);
  header('Cache-Control: max-age=300');
  header('Content-Type: application/json');
  echo json_encode([
    'error' => [
      'message' => 'Can not get requested URL: '.$e->getMessage()
    ]
  ]);
  die();
}
