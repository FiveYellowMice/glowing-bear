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

  $doc = DOMDocument::loadHTML($body);
  if ($doc == false) {
    throw new HTMLParsingException('Parse failed.');
  }

  // Get title.
  $title_text = null;

  $title_element = $doc->getElementsByTagName('title')->item(0);
  if ($title_element) {
    $title_text = trim($title_element->textContent);
  }
  $title_element = null;

  if (!$title_text) {
    $h1_element = $doc->getElementsByTagName('h1')->item(0);
    if ($h1_element) {
      $title_text = trim($h1_element->textContent);
    }
    $h1_element = null;
  }

  if (!$title_text) {
    $title_text = null;
  }

  // Get description.
  $description_text = null;

  $meta_elements = $doc->getElementsByTagName('meta');
  $meta_description_element = null;
  foreach ($meta_elements as $meta_element) {
    $name_attribute = $meta_element->attributes->getNamedItem('name');
    if ($name_attribute && $name_attribute->nodeValue == 'description') {
      $meta_description_element = $meta_element;
      break;
    }
  }
  if ($meta_description_element) {
    $content_attribute = $meta_description_element->attributes->getNamedItem('content');
    if ($content_attribute) {
      $description_text = trim($content_attribute->nodeValue);
    }
  }

  if (!$description_text) {
    $description_text = null;
  }

  //====

  header('Cache-Control: max-age=3600');
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode([
    'type' => $content_type,
    'length' => $content_length,
    'summary' => [
      'title' => $title_text,
      'description' => $description_text,
      'origin' => $final_origin,
    ],
  ], JSON_UNESCAPED_UNICODE);

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
