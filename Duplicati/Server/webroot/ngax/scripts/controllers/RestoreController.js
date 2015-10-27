backupApp.controller('RestoreController', function ($scope, $routeParams, $location, AppService, AppUtils, SystemInfo, ServerStatus) {

	$scope.SystemInfo = SystemInfo.watch($scope);
    $scope.AppUtils = AppUtils;

    $scope.restore_step = 0;
    $scope.connecting = false;
    $scope.isTemporaryBackup = true;

    var filesetsBuilt = {};
    var filesetsRepaired = {};
    var filesetStamps = {};
    var inProgress = {};

    $scope.filesetStamps = filesetStamps;
    $scope.treedata = {};
    $scope.Selected = [];

    function createGroupLabel(dt) {
        var dateStamp = function(a) { return a.getFullYear() * 10000 + a.getMonth() * 100 + a.getDate(); }
        
        var now       = new Date();
        var today     = dateStamp(now);
        var yesterday = dateStamp(new Date(new Date().setDate(now.getDate()   - 1)));
        var week      = dateStamp(new Date(new Date().setDate(now.getDate()   - 7)));
        var thismonth = dateStamp(new Date(new Date().setMonth(now.getMonth() - 1)));
        var lastmonth = dateStamp(new Date(new Date().setMonth(now.getMonth() - 2)));

        var dateBuckets = [
            {text:'Today', stamp: today}, 
            {text: 'Yesterday', stamp: yesterday},
            {text: 'This week', stamp: week},
            {text: 'This month', stamp: thismonth},
            {text: 'Last month', stamp: lastmonth}
        ];

        var stamp = dateStamp(dt);

        for(var t in dateBuckets)
            if (stamp >= dateBuckets[t].stamp)
            	return dateBuckets[t].text;

        return dt.getFullYear() + '';
    };

	$scope.HideEditUri = function() {
		$scope.EditUriState = false;
	};

	$scope.doConnect = function() {
		$scope.connecting = true;
		$scope.ConnectionProgress = 'Registering temporary backup ...';

		var opts = {};
		var obj = {'Backup': {'TargetURL':  $scope.TargetURL } };

		if (($scope.EncryptionPassphrase || '') == '')
			opts['--no-encryption'] = 'true';
		else
			opts['passphrase'] = $scope.EncryptionPassphrase;

		if (!AppUtils.parse_extra_options($scope.ExtendedOptions, opts))
			return false;

		obj.Backup.Settings = [];
		for(var k in opts) {
			obj.Backup.Settings.push({
				Name: k,
				Value: opts[k]
			});
		}

		AppService.post('/backups?temporary=true', obj, {'headers': {'Content-Type': 'application/json'}}).then(
			function(resp) {
				$scope.ConnectionProgress = 'Listing backup dates ...';
				$scope.BackupID = resp.data.ID;
				$scope.fetchBackupTimes();
			}, function(resp) {
            	var message = resp.statusText;
            	if (resp.data != null && resp.data.Message != null)
            		message = resp.data.Message;

				$scope.connecting = false;
				$scope.ConnectionProgress = '';
				alert('Failed to connect: ' + message);
			}
		);
	};

	$scope.fetchBackupTimes = function() {
		AppService.get('/backup/' + $scope.BackupID + '/filesets').then(
			function(resp) {
				$scope.Filesets = resp.data;

				for(var n in filesetStamps)
					delete filesetStamps[n];

				for(var n in $scope.Filesets) {
					var item = $scope.Filesets[n];
					item.DisplayLabel = item.Version + ': ' + AppUtils.toDisplayDateAndTime(AppUtils.parseDate(item.Time));
					item.GroupLabel = n == 0 ? 'Latests' : createGroupLabel(AppUtils.parseDate(item.Time));

					filesetStamps[item.Version + ''] = item.Time;
				}

				$scope.RestoreVersion = 0;
				$scope.restore_step = 1;
				$scope.connecting = false;
				$scope.ConnectionProgress = '';

				$scope.fetchPathInformation();
			},

			function(resp) {
            	var message = resp.statusText;
            	if (resp.data != null && resp.data.Message != null)
            		message = resp.data.Message;

				$scope.connecting = false;
				$scope.ConnectionProgress = '';
				alert('Failed to connect: ' + message);
			}
		);
	};

	$scope.fetchPathInformation = function() {
		var version = $scope.RestoreVersion + '';

		if (inProgress[version] || $scope.restore_step != 1)
			return;

		if (filesetsBuilt[version] == null) {
			if ($scope.isTemporaryBackup && filesetsRepaired[version] == null) {
				$scope.connecting = true;
				$scope.ConnectionProgress = 'Fetching path information ...';
				inProgress[version] = true;

				AppService.post('/backup/' + $scope.BackupID + '/repairupdate', { 'only-paths': true, 'time': filesetStamps[version + '']}).then(
					function(resp) {

						var taskid = resp.data.ID;
						inProgress[version] = taskid;
						$scope.taskid = taskid;

						ServerStatus.callWhenTaskCompletes(taskid, function() {

							AppService.get('/task/' + taskid).then(function(resp) {
								delete inProgress[version];
								$scope.connecting = false;
								$scope.ConnectionProgress = '';

								if (resp.data.Status == 'Completed')
								{
									filesetsRepaired[version] = true;
									$scope.fetchPathInformation();
								}
								else
								{
									alert('Failed to fetch path information: ' + resp.data.ErrorMessage);
								}

							}, function(resp) {
								delete inProgress[version];
								$scope.connecting = false;
								$scope.ConnectionProgress = '';

				            	var message = resp.statusText;
				            	if (resp.data != null && resp.data.Message != null)
				            		message = resp.data.Message;
								alert('Failed to fetch path information: ' + message);
							});
						});
					},
					function(resp) {
						delete inProgress[version];

		            	var message = resp.statusText;
		            	if (resp.data != null && resp.data.Message != null)
		            		message = resp.data.Message;

						$scope.connecting = false;
						$scope.ConnectionProgress = '';
						alert('Failed to connect: ' + message);
					}
				);

			} else {
				var stamp = filesetStamps[version];
				$scope.connecting = true;
				$scope.ConnectionProgress = 'Fetching path information ...';
				inProgress[version] = true;

				AppService.get('/backup/' + $scope.BackupID + '/files/*?prefix-only=true&folder-contents=false&time=' + encodeURIComponent(stamp)).then(
					function(resp) {
						delete inProgress[version];
						$scope.connecting = false;
						$scope.ConnectionProgress = '';

						filesetsBuilt[version] = resp.data.Files;
						$scope.Paths = filesetsBuilt[version];
					},
					function(resp) {
						delete inProgress[version];
		            	var message = resp.statusText;
		            	if (resp.data != null && resp.data.Message != null)
		            		message = resp.data.Message;

						$scope.connecting = false;
						$scope.ConnectionProgress = '';
						alert('Failed to connect: ' + message);
					}
				);
			}

		} else {
			$scope.Paths = filesetsBuilt[version];
		}
	};

	$scope.$watch('RestoreVersion', function() { $scope.fetchPathInformation(); });

	$scope.onClickNext = function() {
		var results =  $scope.treedata.allSelected();
		if (results.length == 0) {
			alert('No items to restore, please select one or more items');
			return;
		}
	}

});