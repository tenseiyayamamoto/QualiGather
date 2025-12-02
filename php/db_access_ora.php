<?php
    function oracle_con_kobe()
    {
        $conn = oci_connect(
            'drs',
            'drs',
            '10.120.145.245:1521/smartkobedev.world',
            'AL32UTF8'
        );

        ChangeDatetimeFormat($conn);
        return $conn;
    }

    function oracle_con_oyama()
    {
        $conn = oci_connect(
            'drs',
            'drs',
            'dmzsvr-vm14.dmz.oya.local.denso-ten.com:1521/gmstnjpo.world',
            'AL32UTF8'
        );

        ChangeDatetimeFormat($conn);
        return $conn;
    }

    function oracle_con_nakatsu()
    {
        $conn = oci_connect(
            'drs',
            'drs',
            '10.251.23.41:1521/smartftml.world',
            'AL32UTF8'
        );

        ChangeDatetimeFormat($conn);
        return $conn;
    }

    function oracle_con_tnwx()
    {
        $conn = oci_connect(
            'drs',
            'drs',
            'gms-wx-vip01.dmz.tnwx.local.denso-ten.com:1521/smart.world',
            'AL32UTF8'
        );

        ChangeDatetimeFormat($conn);
        return $conn;
    }

    function oracle_con_tnph(){
        $conn = oci_connect(
            'drs',
            'drs',
            'gms-ph-vip01.dmz.tnph.local.denso-ten.com:1521/smart.world',
            'AL32UTF8'
        );

        ChangeDatetimeFormat($conn);
        return $conn;
    }

    function oracle_con_tnth(){
        $conn = oci_connect(
            'drs',
            'drs',
            'gms-th-vip01.dmz.tnth.local.denso-ten.com:1521/smart.world',
            'AL32UTF8'
        );
        ChangeDatetimeFormat($conn);
        return $conn;
    }

    function oracle_con_tnmi(){
        $conn = oci_connect(
            'drs',
            'drs',
            '10.120.145.245:1522/xe',
            'AL32UTF8'
        );
        ChangeDatetimeFormat($conn);
        return $conn;
    }


        // PHPでは日付取得時に英語表記になるため、現セッションの取得フォーマットを変更
        function ChangeDatetimeFormat($conn){
            $sql = "alter session set nls_date_format='YYYY/MM/DD HH24:MI:SS'";
            $stid = oci_parse($conn, $sql);
    
            oci_execute($stid);
        }

    function oracle_con($base){
        $conn = null;
        switch($base){
            case 'kobe':
                $conn = oracle_con_kobe();
                break;

            case "oyama":
                $conn = oracle_con_oyama();
                break;
    
            case "nakatsu":
                $conn = oracle_con_nakatsu();
                break;
    
            case "tnwx":
                $conn = oracle_con_tnwx();
                break;

            case "tnph":
                $conn = oracle_con_tnph();
                break;

            case "tnth":
                $conn = oracle_con_tnth();
                break;

                case "tnmi":
                $conn = oracle_con_tnmi();
                break;
        }
        return $conn;
    }

    function Select($conn, $sql, $params=null){
        $stid = oci_parse($conn, $sql);
        $json_array = [];

        try{
            if(!is_null($params)){
                foreach($params as $row){
                    oci_bind_by_name($stid, $row['key'], $row['value']);
                }
            }

            oci_execute($stid);
            while($row = oci_fetch_array($stid, OCI_ASSOC+OCI_RETURN_NULLS)){
                array_push($json_array, $row);
            }
        }
        catch(PDOException $e){
            $err = $e->getMessage();
            die(json_encode($row));
        }
        return $json_array;
    }
?>