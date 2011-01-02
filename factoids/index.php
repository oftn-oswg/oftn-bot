<?php
$filename = "factoids.json";
$factoids_max = 50; // per page

function html($str, $echo=true) {
	$str = htmlentities($str, ENT_QUOTES, "UTF-8");
	if ($echo) echo $str;
	else return $str;
}
function popularsort($a, $b) {
	return $b['popularity'] - $a['popularity'];
}
function query_set($key, $value=null) {
	$str = "?".$key.($value==null?'':urlencode($value));
	foreach ($_GET as $k => $v) {
		if ($k != $key) {
			$str .= '&'.$k."=".urlencode($v);
		}
	}
	echo $str;
}

$json = array(); 
$errors = array();
if( file_exists($filename) ) { 
	$json = json_decode(file_get_contents($filename), true, 4); 
	$json_error = json_last_error(); 
	if( $json_error == JSON_ERROR_DEPTH ) { $errors[] = 'JSON Error: Maximum stack depth exceeded in the directory description file.'; }
	if( $json_error == JSON_ERROR_CTRL_CHAR ) { $errors[] = 'JSON Error: An unexpected control character was found in your directory description file.'; }
	if( $json_error == JSON_ERROR_SYNTAX ) { $errors[] = 'JSON Error: Your directory description file has a syntax error or malformed JSON.'; }
}
$db = $json['factoids'];

if (isset($_GET['q']) && !empty($_GET['q'])) {
	$q = strtolower($_GET['q']);
	foreach ($db as $k => $v) {
		if (isset($v['value'])) {
			if (strpos(strtolower($k." ".$v['value']), $q) === false) {
				unset($db[$k]);
			}
		}
	}
}

foreach ($db as $k => $v) {
	if (isset($v['alias'])) {
		if (isset($db[$v['alias']])) {
			$alias = array("key"=>$k,"popularity"=>$v['popularity']);
			if (!isset($db[$v['alias']]['aliases'])) {
				$db[$v['alias']]['aliases'] = array($alias);
			} else {
				$db[$v['alias']]['aliases'][] = $alias;
			}
		}
		unset($db[$k]);
	}
}

uasort($db, "popularsort");
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<link href="style-<?php echo isset($_GET['dark'])?'dark':'light'; ?>.css" rel="stylesheet" type="text/css" />
<title>Factoids</title>
</head>
<body>

<div id="container">
	<h1>IRC Factoids</h1>
	
	<p>Factoids take up to <?php $min = floor($json['wait']/60000); echo $min." minute".($min!=1?"s":""); ?> to save to disk.</p>
	
	<div id="searchbox">
		<form action="" method="get">
			<label>
				<span>Search</span>
				<input type="text" name="q" class="input" value="<?php echo isset($_GET['q']) ? html($_GET['q']) : ''; ?>" />
			</label>
			<input type="submit" value="Search" class="submit" />
		</form>
	</div>
	
	<?php
	if (count($errors)) { foreach( $errors as $error ) { ?> 
	<div class="error"><?php html($error); ?></div>
	<?php } } ?>
	
	<?php if (count($db)) { ?>
	<dl class="factoidlist"><?php foreach ($db as $key => $data) { if (!$factoids_max--) continue; ?> 
		<div class="factoid">
			<dt class="aliases"><span class="name"><?php html($key); ?></span><?php if (isset($data['aliases'])) { ?><ul><?php foreach ($data['aliases'] as $alias) {?><li class="alias"><?php html($alias['key']." (".$alias['popularity'].")"); ?></li><?php } ?></ul><?php } ?></dt>
			<dd>
				<div class="contents"><?php echo preg_replace("@(s?ftp|https?)://[-\\w\\.]+(:\\d+)?([-/\\w\\.?=+%]+)@i", "<a href=\"\\0\">\\0</a>", html($data['value'], false)); ?></div>
				<div class="popularity">Popularity: <?php echo $data['popularity']; ?></div>
			</dd>
		</div>
	<?php } ?></dl><?php } ?>
	
	<div id="footer">
		Style: [<a href="<?php query_set('dark'); ?>">dark</a>]
	</div>
	
</div>

<script src="script.js" type="text/javascript"></script>

</body>
</html>
