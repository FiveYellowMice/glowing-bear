<?php

class InvalidUrlException extends Exception {}
class RequestFailedException extends Exception {}


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
  if ($content_length == -1) {
    $content_length = null;
  }

  header('Cache-Control: max-age=3600');
  header('Content-Type: application/json');
  echo json_encode([
    'type' => $content_type,
    'length' => $content_length,
  ]);

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
